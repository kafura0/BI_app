import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..config import get_settings
from ..database import get_db
from ..models.user import User
from ..models.organization import Membership, MemberRole
from ..schemas.auth import TokenPayload

settings = get_settings()
bearer_scheme = HTTPBearer()


def create_access_token(user_id: uuid.UUID, organization_id: uuid.UUID, role: MemberRole) -> tuple[str, int]:
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "org": str(organization_id),
        "role": role.value,
        "exp": int(expire.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return TokenPayload(**payload)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


class TenantContext:
    """Extracted from JWT and injected into every protected route."""
    def __init__(self, user_id: uuid.UUID, organization_id: uuid.UUID, role: MemberRole):
        self.user_id = user_id
        self.organization_id = organization_id
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role == MemberRole.admin

    @property
    def is_analyst(self) -> bool:
        return self.role in (MemberRole.admin, MemberRole.analyst)


async def get_current_tenant(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TenantContext:
    payload = decode_token(credentials.credentials)

    user_id = uuid.UUID(payload.sub)
    org_id = uuid.UUID(payload.org)
    role = MemberRole(payload.role)

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Verify membership still valid
    membership_result = await db.execute(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == org_id,
        )
    )
    membership = membership_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Membership not found")

    return TenantContext(user_id=user_id, organization_id=org_id, role=membership.role)


def require_admin(tenant: Annotated[TenantContext, Depends(get_current_tenant)]) -> TenantContext:
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return tenant


def require_analyst(tenant: Annotated[TenantContext, Depends(get_current_tenant)]) -> TenantContext:
    if not tenant.is_analyst:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analyst or Admin role required")
    return tenant
