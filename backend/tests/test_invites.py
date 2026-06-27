"""Tests for team invite endpoints: create, list, revoke, members, accept."""
import pytest
from unittest.mock import patch
from httpx import ASGITransport, AsyncClient
from app.main import app

REGISTER_URL = "/api/v1/auth/register"
INVITES_URL = "/api/v1/invites"

ADMIN_USER = {
    "email": "admin@corp.com",
    "password": "AdminPass1",
    "full_name": "Admin User",
    "organization": {"name": "Corp", "slug": "corp"},
}
ASSISTANT_USER = {
    "email": "assistant@corp.com",
    "password": "Assist1",
    "full_name": "Assistant User",
    "organization": {"name": "Assistant Org", "slug": "assistant-org"},
}

KNOWN_INVITE_TOKEN = "test-invite-token-abc123"


# -----------------------------------------------------------------------
# Create invite
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_invite(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.post(INVITES_URL, json={
        "email": "newguy@example.com",
        "role": "analyst",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "newguy@example.com"
    assert body["role"] == "analyst"
    assert body["status"] == "pending"
    assert "id" in body


@pytest.mark.asyncio
async def test_create_invite_duplicate(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    await client.post(INVITES_URL, json={"email": "dupe@example.com", "role": "analyst"})
    resp = await client.post(INVITES_URL, json={"email": "dupe@example.com", "role": "analyst"})
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_invite_existing_member(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.post(INVITES_URL, json={
        "email": ADMIN_USER["email"],
        "role": "analyst",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_invite_requires_auth(client):
    resp = await client.post(INVITES_URL, json={"email": "x@x.com", "role": "analyst"})
    assert resp.status_code == 401


# -----------------------------------------------------------------------
# List invites
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_invites(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    await client.post(INVITES_URL, json={"email": "first@example.com", "role": "analyst"})
    await client.post(INVITES_URL, json={"email": "second@example.com", "role": "viewer"})
    resp = await client.get(INVITES_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2
    assert body[0]["email"] == "second@example.com"  # most recent first


@pytest.mark.asyncio
async def test_list_invites_empty(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.get(INVITES_URL)
    assert resp.status_code == 200
    assert resp.json() == []


# -----------------------------------------------------------------------
# Revoke invite
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_revoke_invite(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    create = await client.post(INVITES_URL, json={"email": "revoke@example.com", "role": "analyst"})
    invite_id = create.json()["id"]
    resp = await client.delete(f"{INVITES_URL}/{invite_id}")
    assert resp.status_code == 204
    listing = await client.get(INVITES_URL)
    assert len(listing.json()) == 0


@pytest.mark.asyncio
async def test_revoke_invite_not_found(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.delete(f"{INVITES_URL}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# -----------------------------------------------------------------------
# Accept invite (multi-user)
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_accept_invite(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    with patch("secrets.token_urlsafe", return_value=KNOWN_INVITE_TOKEN):
        await client.post(INVITES_URL, json={
            "email": ASSISTANT_USER["email"],
            "role": "analyst",
        })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client_b:
        await client_b.post(REGISTER_URL, json=ASSISTANT_USER)
        resp = await client_b.post(f"{INVITES_URL}/accept", params={"token": KNOWN_INVITE_TOKEN})
        assert resp.status_code == 200
        body = resp.json()
        assert "organization_id" in body
        assert body["role"] == "analyst"

    members = await client.get(f"{INVITES_URL}/members")
    assert len(members.json()) == 2


@pytest.mark.asyncio
async def test_accept_invite_invalid_token(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.post(f"{INVITES_URL}/accept", params={"token": "bogus-token"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_accept_invite_wrong_email(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    with patch("secrets.token_urlsafe", return_value=KNOWN_INVITE_TOKEN):
        await client.post(INVITES_URL, json={
            "email": ASSISTANT_USER["email"],
            "role": "analyst",
        })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client_wrong:
        await client_wrong.post(REGISTER_URL, json={
            "email": "wrong@example.com",
            "password": "Wrong1",
            "full_name": "Wrong User",
            "organization": {"name": "Wrong Org", "slug": "wrong-org"},
        })
        resp = await client_wrong.post(f"{INVITES_URL}/accept", params={"token": KNOWN_INVITE_TOKEN})
        assert resp.status_code == 403


# -----------------------------------------------------------------------
# Members
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_members(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.get(f"{INVITES_URL}/members")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["email"] == ADMIN_USER["email"]
    assert body[0]["role"] == "admin"


@pytest.mark.asyncio
async def test_update_member_role(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    with patch("secrets.token_urlsafe", return_value=KNOWN_INVITE_TOKEN):
        await client.post(INVITES_URL, json={
            "email": ASSISTANT_USER["email"],
            "role": "viewer",
        })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client_b:
        await client_b.post(REGISTER_URL, json=ASSISTANT_USER)
        await client_b.post(f"{INVITES_URL}/accept", params={"token": KNOWN_INVITE_TOKEN})

    members = await client.get(f"{INVITES_URL}/members")
    assistant = [m for m in members.json() if m["email"] == ASSISTANT_USER["email"]][0]
    uid = assistant["user_id"]

    resp = await client.patch(f"{INVITES_URL}/members/{uid}", params={"role": "admin"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_update_member_role_not_found(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    resp = await client.patch(
        f"{INVITES_URL}/members/00000000-0000-0000-0000-000000000000",
        params={"role": "admin"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_remove_member(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    with patch("secrets.token_urlsafe", return_value=KNOWN_INVITE_TOKEN):
        await client.post(INVITES_URL, json={
            "email": ASSISTANT_USER["email"],
            "role": "viewer",
        })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client_b:
        await client_b.post(REGISTER_URL, json=ASSISTANT_USER)
        await client_b.post(f"{INVITES_URL}/accept", params={"token": KNOWN_INVITE_TOKEN})

    members = await client.get(f"{INVITES_URL}/members")
    assistant = [m for m in members.json() if m["email"] == ASSISTANT_USER["email"]][0]
    uid = assistant["user_id"]

    resp = await client.delete(f"{INVITES_URL}/members/{uid}")
    assert resp.status_code == 204

    members_after = await client.get(f"{INVITES_URL}/members")
    assert len(members_after.json()) == 1


@pytest.mark.asyncio
async def test_remove_member_cannot_remove_self(client):
    await client.post(REGISTER_URL, json=ADMIN_USER)
    members = await client.get(f"{INVITES_URL}/members")
    admin_uid = members.json()[0]["user_id"]
    resp = await client.delete(f"{INVITES_URL}/members/{admin_uid}")
    assert resp.status_code == 400
