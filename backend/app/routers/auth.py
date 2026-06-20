import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..middleware.auth import get_current_tenant, TenantContext, set_auth_cookie, clear_auth_cookie
from ..models.user import User
from ..rate_limit import limiter
from ..schemas.auth import UserCreate, UserLogin, RegisterResponse, UserOut
from ..services.auth_service import register_user, login_user
from ..services.email_service import send_verification_email, send_welcome_email
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
    set_auth_cookie(response, token)
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
    set_auth_cookie(response, token)
    return result


@router.post("/logout")
async def logout(
    response: Response,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
) -> dict:
    clear_auth_cookie(response)
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


def _make_verify_token(user_id: object) -> str:
    from jose import jwt
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(user_id), "type": "email_verify", "exp": int(expire.timestamp())},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
