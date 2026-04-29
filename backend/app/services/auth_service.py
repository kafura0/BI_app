import uuid
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from passlib.context import CryptContext

from ..models.user import User
from ..models.organization import Organization, Membership, MemberRole, PlanType
from ..schemas.auth import UserCreate, UserOut, OrganizationOut, Token, RegisterResponse
from ..middleware.auth import create_access_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def register_user(db: AsyncSession, data: UserCreate) -> RegisterResponse:
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Check slug uniqueness
    existing_org = await db.execute(select(Organization).where(Organization.slug == data.organization.slug))
    if existing_org.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug already taken")

    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.flush()  # get user.id

    org = Organization(
        name=data.organization.name,
        slug=data.organization.slug,
        plan=PlanType.free,
    )
    db.add(org)
    await db.flush()

    membership = Membership(
        user_id=user.id,
        organization_id=org.id,
        role=MemberRole.admin,
    )
    db.add(membership)
    await db.flush()

    token_str, expires_in = create_access_token(user.id, org.id, MemberRole.admin)

    return RegisterResponse(
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
        token=Token(access_token=token_str, expires_in=expires_in),
        role=MemberRole.admin.value,
    )


async def login_user(db: AsyncSession, email: str, password: str) -> RegisterResponse:
    result = await db.execute(select(User).where(User.email == email.lower(), User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Get primary membership (first admin, else first)
    membership_result = await db.execute(
        select(Membership).where(Membership.user_id == user.id).order_by(Membership.created_at)
    )
    membership = membership_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization membership found")

    org_result = await db.execute(select(Organization).where(Organization.id == membership.organization_id))
    org = org_result.scalar_one_or_none()

    token_str, expires_in = create_access_token(user.id, membership.organization_id, membership.role)

    return RegisterResponse(
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
        token=Token(access_token=token_str, expires_in=expires_in),
        role=membership.role.value,
    )
