"""Tests for auth endpoints: register, login, logout, me, verify-email, resend."""
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config import get_settings

settings = get_settings()
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
LOGOUT_URL = "/api/v1/auth/logout"
ME_URL = "/api/v1/auth/me"
VERIFY_URL = "/api/v1/auth/verify-email"
RESEND_URL = "/api/v1/auth/resend-verification"

BASE_USER = {
    "email": "alice@example.com",
    "password": "StrongPass1",
    "full_name": "Alice Smith",
    "organization": {"name": "Acme Inc", "slug": "acme-inc"},
}


# ---------------------------------------------------------------------------
# /register
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post(REGISTER_URL, json=BASE_USER)
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["email"] == BASE_USER["email"]
    assert body["user"]["full_name"] == BASE_USER["full_name"]
    assert body["user"]["is_active"] is True
    assert body["user"]["email_verified"] is False
    assert body["organization"]["name"] == BASE_USER["organization"]["name"]
    assert body["organization"]["slug"] == BASE_USER["organization"]["slug"]
    assert body["organization"]["plan"] == "free"
    assert body["role"] == "admin"
    assert "access_token" in resp.cookies
    assert resp.cookies["access_token"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(REGISTER_URL, json=BASE_USER)
    assert resp.status_code == 409
    assert "already" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_slug(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    dup = {**BASE_USER, "email": "bob@example.com"}
    resp = await client.post(REGISTER_URL, json=dup)
    assert resp.status_code == 409
    assert "slug" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_weak_password(client):
    data = {**BASE_USER, "password": "short"}
    resp = await client.post(REGISTER_URL, json=data)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_password_no_digit(client):
    data = {**BASE_USER, "password": "abcdefghijk"}
    resp = await client.post(REGISTER_URL, json=data)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_fields(client):
    resp = await client.post(REGISTER_URL, json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(LOGIN_URL, json={
        "email": BASE_USER["email"], "password": BASE_USER["password"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["email"] == BASE_USER["email"]
    assert "access_token" in resp.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(LOGIN_URL, json={
        "email": BASE_USER["email"], "password": "WrongPass1",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post(LOGIN_URL, json={
        "email": "nobody@example.com", "password": "SomePass1",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client, db_session):
    from app.models.user import User
    from sqlalchemy import select

    await client.post(REGISTER_URL, json=BASE_USER)
    result = await db_session.execute(select(User).where(User.email == BASE_USER["email"]))
    user = result.scalar_one()
    user.is_active = False
    await db_session.flush()

    resp = await client.post(LOGIN_URL, json={
        "email": BASE_USER["email"], "password": BASE_USER["password"],
    })
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /logout
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_logout(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(LOGOUT_URL)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out"
    # Cookie should be cleared
    cookie = resp.cookies.get("access_token")
    assert cookie is None or cookie == ""


@pytest.mark.asyncio
async def test_logout_without_auth(client):
    resp = await client.post(LOGOUT_URL)
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_me_authenticated(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(ME_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == BASE_USER["email"]
    assert body["full_name"] == BASE_USER["full_name"]
    assert body["is_active"] is True
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get(ME_URL)
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /verify-email
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_verify_email_valid(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    from app.models.user import User
    from sqlalchemy import select
    from app.database import AsyncSession
    # Grab user id to craft token
    transport = client._transport
    # Use db_session from fixture — client already uses overridden get_db
    # We'll make a direct request with a hand-crafted token

    # Actually we can just re-use a token generated by the server's logic
    # by manually encoding one
    user_result = await client.get(ME_URL)
    user_id = user_result.json()["id"]

    token = jwt.encode(
        {"sub": str(user_id), "type": "email_verify", "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )
    resp = await client.get(VERIFY_URL, params={"token": token})
    assert resp.status_code == 200
    assert "verified" in resp.json()["message"].lower()

    # Verify again — should still succeed
    resp2 = await client.get(VERIFY_URL, params={"token": token})
    assert resp2.status_code == 200


@pytest.mark.asyncio
async def test_verify_email_expired_token(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    user_result = await client.get(ME_URL)
    user_id = user_result.json()["id"]
    token = jwt.encode(
        {"sub": str(user_id), "type": "email_verify", "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp())},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )
    resp = await client.get(VERIFY_URL, params={"token": token})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_verify_email_invalid_token(client):
    resp = await client.get(VERIFY_URL, params={"token": "not-a-real-token"})
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# /resend-verification
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resend_verification(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(RESEND_URL)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Verification email sent"


@pytest.mark.asyncio
async def test_resend_verification_already_verified(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    # Manually verify via endpoint
    user_result = await client.get(ME_URL)
    user_id = user_result.json()["id"]
    token = jwt.encode(
        {"sub": str(user_id), "type": "email_verify", "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )
    await client.get(VERIFY_URL, params={"token": token})
    # Now try resend
    resp = await client.post(RESEND_URL)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Email already verified"


@pytest.mark.asyncio
async def test_resend_verification_without_auth(client):
    resp = await client.post(RESEND_URL)
    assert resp.status_code == 401
