"""Tests for insight endpoints: create, list, get by id.

The insight endpoint calls `services.insight_service.generate_insight` which normally
hits OpenAI. We patch that call so tests never reach an external provider.
"""
import pytest
from unittest.mock import patch
from io import BytesIO

REGISTER_URL = "/api/v1/auth/register"
INSIGHTS_URL = "/api/v1/insights"
DATASETS_URL = "/api/v1/datasets"

BASE_USER = {
    "email": "insightuser@example.com",
    "password": "Insight1",
    "full_name": "Insight Seeker",
    "organization": {"name": "Insight Org", "slug": "insight-org"},
}

MOCK_GEN_RESPONSE = {
    "response": {
        "explanation": "Revenue has been growing steadily.",
        "key_metrics": [
            {"label": "Total Revenue", "value": 450, "change": "+15%", "trend": "up"},
        ],
        "suggested_actions": ["Increase marketing spend", "Expand product line"],
    },
    "model": "gpt-4o-mini",
    "tokens_used": 150,
    "prompt_tokens": 80,
    "completion_tokens": 70,
}


@pytest.mark.asyncio
async def test_create_insight_without_dataset(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    with patch("services.insight_service.generate_insight", return_value=MOCK_GEN_RESPONSE):
        resp = await client.post(INSIGHTS_URL, json={
            "query": "What is the revenue trend?",
        })
    assert resp.status_code == 201
    body = resp.json()
    assert body["query"] == "What is the revenue trend?"
    assert body["model_used"] == "gpt-4o-mini"
    assert body["tokens_used"] == 150
    assert body["response"]["explanation"] == "Revenue has been growing steadily."
    assert len(body["response"]["key_metrics"]) == 1
    assert len(body["response"]["suggested_actions"]) == 2
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_create_insight_with_dataset(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    csv = b"month,revenue\nJan,100\nFeb,200\nMar,150\n"
    ds_resp = await client.post(
        DATASETS_URL,
        data={"name": "Revenue Data"},
        files={"file": ("r.csv", BytesIO(csv), "text/csv")},
    )
    ds_id = ds_resp.json()["id"]

    with patch("services.insight_service.generate_insight", return_value=MOCK_GEN_RESPONSE):
        resp = await client.post(INSIGHTS_URL, json={
            "query": "Analyze revenue by month",
            "dataset_id": ds_id,
        })
    assert resp.status_code == 201
    body = resp.json()
    assert body["dataset_id"] == ds_id
    assert body["query"] == "Analyze revenue by month"


@pytest.mark.asyncio
async def test_create_insight_short_query(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(INSIGHTS_URL, json={"query": "hi"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_insight_requires_auth(client):
    resp = await client.post(INSIGHTS_URL, json={"query": "Tell me something"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_insights(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    with patch("services.insight_service.generate_insight", return_value=MOCK_GEN_RESPONSE):
        await client.post(INSIGHTS_URL, json={"query": "First query"})
        await client.post(INSIGHTS_URL, json={"query": "Second query"})
    resp = await client.get(INSIGHTS_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    assert body["items"][0]["query"] == "Second query"  # most recent first


@pytest.mark.asyncio
async def test_list_insights_empty(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(INSIGHTS_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["items"] == []


@pytest.mark.asyncio
async def test_list_insights_pagination(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    with patch("services.insight_service.generate_insight", return_value=MOCK_GEN_RESPONSE):
        for i in range(3):
            await client.post(INSIGHTS_URL, json={"query": f"Query {i}"})
    resp = await client.get(INSIGHTS_URL, params={"page": 1, "page_size": 2})
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["total"] == 3


@pytest.mark.asyncio
async def test_get_insight_by_id(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    with patch("services.insight_service.generate_insight", return_value=MOCK_GEN_RESPONSE):
        create = await client.post(INSIGHTS_URL, json={"query": "Find this insight"})
    insight_id = create.json()["id"]
    resp = await client.get(f"{INSIGHTS_URL}/{insight_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == insight_id
    assert resp.json()["query"] == "Find this insight"


@pytest.mark.asyncio
async def test_get_insight_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(f"{INSIGHTS_URL}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_insights_requires_auth(client):
    resp = await client.get(INSIGHTS_URL)
    assert resp.status_code == 401
