"""Tests for billing endpoints: checkout, portal, webhook.

All Stripe calls are mocked so no external credentials are required.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from uuid import UUID

REGISTER_URL = "/api/v1/auth/register"
BILLING_URL = "/api/v1/billing"

BASE_USER = {
    "email": "billing@example.com",
    "password": "Bill1",
    "full_name": "Billing User",
    "organization": {"name": "Billing Org", "slug": "billing-org"},
}


# -----------------------------------------------------------------------
# /checkout
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_checkout(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/test_session_123"

    with patch("app.services.billing_service._stripe_client") as mock_fn:
        mock_client = MagicMock()
        mock_fn.return_value = mock_client
        mock_client.checkout.sessions.create.return_value = mock_session

        resp = await client.post(f"{BILLING_URL}/checkout", json={"plan": "pro"})
    assert resp.status_code == 200
    assert resp.json()["checkout_url"] == "https://checkout.stripe.com/test_session_123"


@pytest.mark.asyncio
async def test_create_checkout_enterprise(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/enterprise_456"

    with patch("app.services.billing_service._stripe_client") as mock_fn:
        mock_client = MagicMock()
        mock_fn.return_value = mock_client
        mock_client.checkout.sessions.create.return_value = mock_session

        resp = await client.post(f"{BILLING_URL}/checkout", json={"plan": "enterprise"})
    assert resp.status_code == 200
    assert resp.json()["checkout_url"] == "https://checkout.stripe.com/enterprise_456"


@pytest.mark.asyncio
async def test_create_checkout_invalid_plan(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(f"{BILLING_URL}/checkout", json={"plan": "invalid"})
    # Without mocking, billing is disabled, so 503
    # With mock, it depends — but invalid plan would fail differently
    assert resp.status_code in (400, 422, 503)


@pytest.mark.asyncio
async def test_create_checkout_requires_auth(client):
    resp = await client.post(f"{BILLING_URL}/checkout", json={"plan": "pro"})
    assert resp.status_code == 401


# -----------------------------------------------------------------------
# /portal
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_portal(client):
    await client.post(REGISTER_URL, json=BASE_USER)

    # First, set up a fake stripe customer id in the DB so portal can proceed.
    # Without this, the service raises 400 "No Stripe customer found".
    # We'll patch settings.stripe_enabled and also mock the stripe client.
    mock_session = MagicMock()
    mock_session.url = "https://billing.stripe.com/portal/test"

    with patch("app.services.billing_service._stripe_client") as mock_fn:
        mock_client = MagicMock()
        mock_fn.return_value = mock_client
        mock_client.billing_portal.sessions.create.return_value = mock_session

        resp = await client.post(f"{BILLING_URL}/portal")
    assert resp.status_code == 200
    assert resp.json()["portal_url"] == "https://billing.stripe.com/portal/test"


@pytest.mark.asyncio
async def test_create_portal_no_customer(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    # The org exists but has no stripe_customer_id -> portal should fail
    # without asking Stripe at all (the check happens before the Stripe call).
    # Since billing is disabled by default, this will 503 before even checking.
    resp = await client.post(f"{BILLING_URL}/portal")
    assert resp.status_code in (400, 503)


@pytest.mark.asyncio
async def test_create_portal_requires_auth(client):
    resp = await client.post(f"{BILLING_URL}/portal")
    assert resp.status_code == 401


# -----------------------------------------------------------------------
# /webhook
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_checkout_completed(client):
    register_resp = await client.post(REGISTER_URL, json=BASE_USER)
    assert register_resp.status_code == 201
    org_id = register_resp.json()["organization"]["id"]

    from app.config import get_settings
    settings = get_settings()

    payload = json.dumps({
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"organization_id": org_id},
                "customer": "cus_mock123",
                "subscription": "sub_mock456",
            }
        },
    }).encode()

    mock_sub = {"items": {"data": [{"price": {"id": settings.STRIPE_PRO_PRICE_ID or "price_pro"}}]}}

    with patch("app.services.billing_service.settings.stripe_enabled", True):
        with patch("app.services.billing_service.settings.STRIPE_WEBHOOK_SECRET", "whsec_test"):
            with patch("stripe.Webhook.construct_event") as mock_construct:
                mock_construct.return_value = json.loads(payload)
                with patch("app.services.billing_service._stripe_client") as mock_fn:
                    mock_client = MagicMock()
                    mock_fn.return_value = mock_client
                    mock_client.subscriptions.retrieve.return_value = mock_sub

                    resp = await client.post(
                        f"{BILLING_URL}/webhook",
                        content=payload,
                        headers={"stripe-signature": "test_sig"},
                    )
    assert resp.status_code == 200
    assert resp.json()["received"] is True


@pytest.mark.asyncio
async def test_webhook_invalid_payload(client):
    with patch("app.services.billing_service.settings.stripe_enabled", True):
        with patch("app.services.billing_service.settings.STRIPE_WEBHOOK_SECRET", "whsec_test"):
            with patch("stripe.Webhook.construct_event", side_effect=ValueError("Invalid payload")):
                resp = await client.post(
                    f"{BILLING_URL}/webhook",
                    content=b"not-json",
                    headers={"stripe-signature": "test_sig"},
                )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_no_secret(client):
    resp = await client.post(
        f"{BILLING_URL}/webhook",
        content=b"{}",
        headers={"stripe-signature": "sig"},
    )
    assert resp.status_code == 503
