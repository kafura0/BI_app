"""Tests for export endpoints: CSV and PDF export of datasets and dashboards."""
import pytest
from io import BytesIO

REGISTER_URL = "/api/v1/auth/register"
DATASETS_URL = "/api/v1/datasets"
DASHBOARDS_URL = "/api/v1/dashboards"
EXPORT_URL = "/api/v1/export"

BASE_USER = {
    "email": "exportuser@example.com",
    "password": "Export1",
    "full_name": "Export User",
    "organization": {"name": "Export Org", "slug": "export-org"},
}

CSV_CONTENT = b"city,population,country\nNYC,8336000,USA\nTokyo,13929000,Japan\nBerlin,3645000,Germany\n"


async def _setup_dataset(client) -> str:
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(
        DATASETS_URL,
        data={"name": "Cities"},
        files={"file": ("cities.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    return resp.json()["id"]


async def _setup_dashboard(client, ds_id: str) -> str:
    resp = await client.post(DASHBOARDS_URL, json={
        "name": "City Dashboard",
        "dataset_id": ds_id,
    })
    return resp.json()["id"]


# -----------------------------------------------------------------------
# Dataset CSV export
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_dataset_csv(client):
    ds_id = await _setup_dataset(client)
    resp = await client.get(f"{EXPORT_URL}/datasets/{ds_id}/csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv"
    assert "Content-Disposition" in resp.headers
    assert "attachment" in resp.headers["content-disposition"]
    assert ds_id in resp.headers["content-disposition"]
    content = resp.content.decode("utf-8")
    assert "city" in content
    assert "NYC" in content
    assert "Tokyo" in content


@pytest.mark.asyncio
async def test_export_dataset_csv_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(f"{EXPORT_URL}/datasets/00000000-0000-0000-0000-000000000000/csv")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_export_dataset_csv_requires_auth(client):
    resp = await client.get(f"{EXPORT_URL}/datasets/00000000-0000-0000-0000-000000000000/csv")
    assert resp.status_code == 401


# -----------------------------------------------------------------------
# Dataset PDF export
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_dataset_pdf(client):
    ds_id = await _setup_dataset(client)
    resp = await client.get(f"{EXPORT_URL}/datasets/{ds_id}/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "Content-Disposition" in resp.headers
    assert ds_id in resp.headers["content-disposition"]
    assert len(resp.content) > 0


@pytest.mark.asyncio
async def test_export_dataset_pdf_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(f"{EXPORT_URL}/datasets/00000000-0000-0000-0000-000000000000/pdf")
    assert resp.status_code == 404


# -----------------------------------------------------------------------
# Dashboard PDF export
# -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_dashboard_pdf(client):
    ds_id = await _setup_dataset(client)
    dash_id = await _setup_dashboard(client, ds_id)
    resp = await client.get(f"{EXPORT_URL}/dashboards/{dash_id}/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "Content-Disposition" in resp.headers
    assert dash_id in resp.headers["content-disposition"]
    assert len(resp.content) > 0


@pytest.mark.asyncio
async def test_export_dashboard_pdf_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(f"{EXPORT_URL}/dashboards/00000000-0000-0000-0000-000000000000/pdf")
    assert resp.status_code == 404
