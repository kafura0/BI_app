import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..middleware.auth import (
    get_current_tenant, TenantContext, RefreshTokenContext,
    set_auth_cookies, clear_auth_cookies,
    create_access_token, create_refresh_token, decode_refresh_token,
    REFRESH_COOKIE_NAME,
)
from ..models.organization import Organization, Membership, MemberRole
from ..models.user import User
from ..rate_limit import limiter
from ..schemas.auth import UserCreate, UserLogin, ForgotPasswordRequest, ResetPasswordRequest, RegisterResponse, UserOut, OrganizationOut
from ..services.auth_service import register_user, login_user, hash_password
from ..services.email_service import send_verification_email, send_welcome_email, send_password_reset_email
from ..config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: UserCreate,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    result, token = await register_user(db, data)
    refresh_token, _ = _make_refresh_for_result(result)
    set_auth_cookies(response, token, refresh_token)
    import asyncio
    asyncio.create_task(
        send_verification_email(result.user.email, result.user.full_name, result.organization.name, _make_verify_token(result.user.id))
    )
    return result


@router.post("/login", response_model=RegisterResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    data: UserLogin,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    result, token = await login_user(db, data.email, data.password)
    refresh_token, _ = _make_refresh_for_result(result)
    set_auth_cookies(response, token, refresh_token)
    return result


@router.post("/logout")
async def logout(
    response: Response,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
) -> dict:
    clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/verify-email")
async def verify_email(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Verify email from token sent in verification email."""
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "email_verify":
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link")

    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.email_verified:
        user.email_verified = True
        await db.flush()

    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(User).where(User.id == tenant.user_id))
    user = result.scalar_one()
    if user.email_verified:
        return {"message": "Email already verified"}
    import asyncio
    asyncio.create_task(
        send_verification_email(user.email, user.full_name, "your organization", _make_verify_token(user.id))
    )
    return {"message": "Verification email sent"}


@router.get("/me", response_model=UserOut)
async def get_me(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOut:
    result = await db.execute(select(User).where(User.id == tenant.user_id))
    user = result.scalar_one()
    return UserOut.model_validate(user)


@router.post("/refresh", response_model=RegisterResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    payload = decode_refresh_token(token)
    user_id = uuid.UUID(payload["sub"])
    org_id = uuid.UUID(payload["org"])
    role = MemberRole(payload["role"])

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    membership_result = await db.execute(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == org_id,
        )
    )
    membership = membership_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Membership not found")

    new_access_token, _ = create_access_token(user_id, org_id, membership.role)
    new_refresh_token, _ = create_refresh_token(user_id, org_id, membership.role)
    set_auth_cookies(response, new_access_token, new_refresh_token)

    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one()

    return RegisterResponse(
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
        role=membership.role.value,
    )


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()
    if user:
        token = _make_password_reset_token(user.id)
        import asyncio
        asyncio.create_task(send_password_reset_email(user.email, user.full_name, token))
    return {"message": "If an account exists, you'll receive a password reset email"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    try:
        payload = jwt.decode(data.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "password_reset":
            raise ValueError("Invalid token type")
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(data.password)
    await db.flush()
    return {"message": "Password reset successfully"}


def _make_verify_token(user_id: object) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(user_id), "type": "email_verify", "exp": int(expire.timestamp())},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _make_password_reset_token(user_id: object) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode(
        {"sub": str(user_id), "type": "password_reset", "exp": int(expire.timestamp())},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _make_refresh_for_result(result: RegisterResponse) -> tuple[str, int]:
    return create_refresh_token(
        uuid.UUID(str(result.user.id)),
        uuid.UUID(str(result.organization.id)),
        MemberRole(result.role),
    )
