from typing import Annotated
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..middleware.auth import get_current_tenant, TenantContext
from ..models.user import User
from ..services import billing_service

router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    plan: str  # "pro" | "enterprise"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CheckoutResponse:
    user_result = await db.execute(select(User).where(User.id == tenant.user_id))
    user = user_result.scalar_one()
    url = await billing_service.create_checkout_session(db, tenant.organization_id, user.email, data.plan)
    return CheckoutResponse(checkout_url=url)


@router.post("/portal", response_model=PortalResponse)
async def customer_portal(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PortalResponse:
    url = await billing_service.create_customer_portal_session(db, tenant.organization_id)
    return PortalResponse(portal_url=url)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    return await billing_service.handle_webhook(db, payload, sig)
