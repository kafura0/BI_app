import uuid
from typing import Annotated
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..middleware.auth import require_admin, get_current_tenant, TenantContext
from ..models.organization import Organization, Membership, MemberRole
from ..models.invite import Invite, InviteStatus
from ..models.user import User
from ..rate_limit import limiter
from ..services import invite_service

router = APIRouter(prefix="/invites", tags=["Team Invites"])


class InviteCreate(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.analyst


class InviteOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}

    def model_post_init(self, _: object) -> None:
        pass


class MemberOut(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: str
    role: str
    joined_at: str


@router.post("", response_model=dict, status_code=201)
@limiter.limit("10/minute")
async def create_invite(
    request: Request,
    data: InviteCreate,
    tenant: Annotated[TenantContext, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    org_result = await db.execute(select(Organization).where(Organization.id == tenant.organization_id))
    org = org_result.scalar_one()
    user_result = await db.execute(select(User).where(User.id == tenant.user_id))
    user = user_result.scalar_one()

    invite = await invite_service.create_invite(db, tenant.organization_id, user, org, data.email, data.role)
    return {"id": str(invite.id), "email": invite.email, "role": invite.role.value, "status": invite.status.value}


@router.get("", response_model=list[dict])
async def list_invites(
    tenant: Annotated[TenantContext, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    result = await db.execute(
        select(Invite)
        .where(Invite.organization_id == tenant.organization_id, Invite.status == InviteStatus.pending)
        .order_by(Invite.created_at.desc())
    )
    return [
        {"id": str(i.id), "email": i.email, "role": i.role.value, "status": i.status.value, "created_at": i.created_at.isoformat()}
        for i in result.scalars().all()
    ]


@router.delete("/{invite_id}", status_code=204)
async def revoke_invite(
    invite_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await invite_service.revoke_invite(db, invite_id, tenant.organization_id)


@router.post("/accept", response_model=dict)
async def accept_invite(
    token: str,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    user_result = await db.execute(select(User).where(User.id == tenant.user_id))
    user = user_result.scalar_one()
    membership = await invite_service.accept_invite(db, token, user)
    return {"organization_id": str(membership.organization_id), "role": membership.role.value}


@router.get("/members", response_model=list[dict])
async def list_members(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    result = await db.execute(
        select(Membership, User)
        .join(User, User.id == Membership.user_id)
        .where(Membership.organization_id == tenant.organization_id)
        .order_by(Membership.created_at)
    )
    return [
        {
            "user_id": str(m.user_id),
            "email": u.email,
            "full_name": u.full_name,
            "role": m.role.value,
            "joined_at": m.created_at.isoformat(),
        }
        for m, u in result.all()
    ]


@router.patch("/members/{user_id}", response_model=dict)
async def update_member_role(
    user_id: uuid.UUID,
    role: MemberRole,
    tenant: Annotated[TenantContext, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(
        select(Membership).where(Membership.user_id == user_id, Membership.organization_id == tenant.organization_id)
    )
    membership = result.scalar_one_or_none()
    if not membership:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    membership.role = role
    await db.flush()
    return {"user_id": str(user_id), "role": role.value}


@router.delete("/members/{user_id}", status_code=204)
async def remove_member(
    user_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if user_id == tenant.user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove yourself")
    result = await db.execute(
        select(Membership).where(Membership.user_id == user_id, Membership.organization_id == tenant.organization_id)
    )
    membership = result.scalar_one_or_none()
    if membership:
        await db.delete(membership)
