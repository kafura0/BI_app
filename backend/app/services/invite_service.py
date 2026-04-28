import uuid
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.invite import Invite, InviteStatus
from ..models.organization import Organization, Membership, MemberRole
from ..models.user import User
from ..services.email_service import send_invite_email
from ..config import get_settings

settings = get_settings()


async def create_invite(
    db: AsyncSession,
    organization_id: uuid.UUID,
    invited_by_user: User,
    org: Organization,
    email: str,
    role: MemberRole,
) -> Invite:
    # Don't double-invite
    existing = await db.execute(
        select(Invite).where(
            Invite.organization_id == organization_id,
            Invite.email == email.lower(),
            Invite.status == InviteStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pending invite already exists for this email")

    # Check if already a member
    user_result = await db.execute(select(User).where(User.email == email.lower()))
    existing_user = user_result.scalar_one_or_none()
    if existing_user:
        membership = await db.execute(
            select(Membership).where(Membership.user_id == existing_user.id, Membership.organization_id == organization_id)
        )
        if membership.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this organization")

    token = secrets.token_urlsafe(48)
    invite = Invite(
        organization_id=organization_id,
        invited_by=invited_by_user.id,
        email=email.lower(),
        role=role,
        token=token,
        status=InviteStatus.pending,
    )
    db.add(invite)
    await db.flush()

    await send_invite_email(email, invited_by_user.full_name, org.name, role.value, token)
    return invite


async def accept_invite(db: AsyncSession, token: str, user: User) -> Membership:
    result = await db.execute(select(Invite).where(Invite.token == token))
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite token")
    if invite.status != InviteStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invite is {invite.status.value}")
    if invite.email != user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This invite was sent to a different email")

    # Check token age
    expire = invite.created_at.replace(tzinfo=timezone.utc) + timedelta(hours=settings.INVITE_TOKEN_EXPIRE_HOURS)
    if datetime.now(timezone.utc) > expire:
        invite.status = InviteStatus.expired
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")

    membership = Membership(
        user_id=user.id,
        organization_id=invite.organization_id,
        role=invite.role,
    )
    db.add(membership)
    invite.status = InviteStatus.accepted
    await db.flush()
    return membership


async def revoke_invite(db: AsyncSession, invite_id: uuid.UUID, organization_id: uuid.UUID) -> None:
    result = await db.execute(select(Invite).where(Invite.id == invite_id, Invite.organization_id == organization_id))
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    invite.status = InviteStatus.revoked
