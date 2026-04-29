"""
Stripe billing integration.
Supports: Checkout Session creation, Customer Portal, Webhook handling.
"""
import uuid
import logging

import stripe
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.organization import Organization, PlanType
from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

PRICE_TO_PLAN: dict[str, PlanType] = {}


def _stripe_client() -> stripe.StripeClient:
    if not settings.stripe_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing not configured")
    return stripe.StripeClient(settings.STRIPE_SECRET_KEY)


def _build_price_map() -> None:
    global PRICE_TO_PLAN
    PRICE_TO_PLAN = {
        settings.STRIPE_PRO_PRICE_ID: PlanType.pro,
        settings.STRIPE_ENTERPRISE_PRICE_ID: PlanType.enterprise,
    }


_build_price_map()


async def create_checkout_session(
    db: AsyncSession,
    organization_id: uuid.UUID,
    user_email: str,
    plan: str,
) -> str:
    """Returns a Stripe Checkout URL."""
    client = _stripe_client()

    price_id = settings.STRIPE_PRO_PRICE_ID if plan == "pro" else settings.STRIPE_ENTERPRISE_PRICE_ID
    if not price_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Price ID not configured for this plan")

    org_result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = org_result.scalar_one()

    # Reuse existing customer or let Stripe create one
    customer_kwargs: dict = {"email": user_email}
    if org.stripe_customer_id:
        customer_kwargs = {"customer": org.stripe_customer_id}

    session = client.checkout.sessions.create(params={
        **customer_kwargs,
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": settings.STRIPE_SUCCESS_URL,
        "cancel_url": settings.STRIPE_CANCEL_URL,
        "metadata": {"organization_id": str(organization_id)},
        "subscription_data": {"metadata": {"organization_id": str(organization_id)}},
    })

    return session.url  # type: ignore[return-value]


async def create_customer_portal_session(db: AsyncSession, organization_id: uuid.UUID) -> str:
    """Returns a Stripe Customer Portal URL for managing subscription."""
    client = _stripe_client()

    org_result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = org_result.scalar_one()

    if not org.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Stripe customer found. Subscribe first.")

    session = client.billing_portal.sessions.create(params={
        "customer": org.stripe_customer_id,
        "return_url": f"{settings.APP_URL}/billing",
    })
    return session.url  # type: ignore[return-value]


async def handle_webhook(db: AsyncSession, payload: bytes, sig_header: str) -> dict:
    """Process Stripe webhook events. Call from the webhook endpoint."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing not configured")

    try:
        event_data = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    client = _stripe_client()
    event_type = event_data["type"]
    obj = event_data["data"]["object"]

    if event_type == "checkout.session.completed":
        org_id = obj.get("metadata", {}).get("organization_id")
        customer_id = obj.get("customer")
        subscription_id = obj.get("subscription")
        price_id = None
        # Fetch subscription to get price
        if subscription_id:
            sub = client.subscriptions.retrieve(subscription_id)
            price_id = sub["items"]["data"][0]["price"]["id"] if sub else None  # type: ignore

        if org_id:
            await _update_org_subscription(db, uuid.UUID(org_id), customer_id, subscription_id, price_id, "active")

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        org_id = obj.get("metadata", {}).get("organization_id")
        sub_status = obj.get("status", "canceled")
        price_id = obj["items"]["data"][0]["price"]["id"] if obj.get("items") else None  # type: ignore
        plan = PRICE_TO_PLAN.get(price_id or "", PlanType.free) if sub_status == "active" else PlanType.free

        if org_id:
            result = await db.execute(select(Organization).where(Organization.id == uuid.UUID(org_id)))
            org = result.scalar_one_or_none()
            if org:
                org.stripe_subscription_status = sub_status
                org.plan = plan
                await db.flush()

    return {"received": True}


async def _update_org_subscription(
    db: AsyncSession,
    organization_id: uuid.UUID,
    customer_id: str | None,
    subscription_id: str | None,
    price_id: str | None,
    sub_status: str,
) -> None:
    result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = result.scalar_one_or_none()
    if not org:
        logger.warning("Webhook: org %s not found", organization_id)
        return

    if customer_id:
        org.stripe_customer_id = customer_id
    if subscription_id:
        org.stripe_subscription_id = subscription_id

    org.stripe_subscription_status = sub_status
    org.plan = PRICE_TO_PLAN.get(price_id or "", PlanType.pro)
    await db.flush()
    logger.info("Updated org %s to plan=%s status=%s", organization_id, org.plan, sub_status)
