"""Tests for dashboard endpoints: create, list, get data, update, delete."""
import pytest
from io import BytesIO

REGISTER_URL = "/api/v1/auth/register"
DASHBOARDS_URL = "/api/v1/dashboards"
DATASETS_URL = "/api/v1/datasets"

BASE_USER = {
    "email": "dashuser@example.com",
    "password": "DashPass1",
    "full_name": "Dash Builder",
    "organization": {"name": "Dash Org", "slug": "dash-org"},
}

CSV_CONTENT = b"product,revenue,date\nWidget,100,2024-01-01\nGadget,200,2024-02-01\nWidget,150,2024-03-01\n"


async def _upload_dataset(client) -> str:
    resp = await client.post(
        DATASETS_URL,
        data={"name": "Sales"},
        files={"file": ("sales.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_dashboard_auto_generate(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    resp = await client.post(DASHBOARDS_URL, json={
        "name": "Auto Dashboard",
        "dataset_id": ds_id,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Auto Dashboard"
    assert body["dataset_id"] == ds_id
    assert len(body["widgets"]) > 0
    assert body["is_default"] is True


@pytest.mark.asyncio
async def test_create_dashboard_manual_widgets(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    widgets = [
        {
            "id": "w1",
            "type": "metric_card",
            "title": "Total Revenue",
            "y_column": "revenue",
            "aggregation": "sum",
            "position": {"x": 0, "y": 0, "w": 4, "h": 2},
            "color": "#6366f1",
        },
    ]
    resp = await client.post(DASHBOARDS_URL, json={
        "name": "Manual Dashboard",
        "dataset_id": ds_id,
        "widgets": widgets,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Manual Dashboard"
    assert len(body["widgets"]) == 1
    assert body["widgets"][0]["id"] == "w1"


@pytest.mark.asyncio
async def test_create_dashboard_missing_dataset_id(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.post(DASHBOARDS_URL, json={"name": "No Dataset"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_dashboards(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    await client.post(DASHBOARDS_URL, json={"name": "D1", "dataset_id": ds_id})
    await client.post(DASHBOARDS_URL, json={"name": "D2", "dataset_id": ds_id})
    resp = await client.get(DASHBOARDS_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2
    assert body[0]["name"] == "D2"  # most recent first


@pytest.mark.asyncio
async def test_list_dashboards_empty(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(DASHBOARDS_URL)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_dashboard_data(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    create = await client.post(DASHBOARDS_URL, json={
        "name": "Data Dashboard",
        "dataset_id": ds_id,
    })
    dash_id = create.json()["id"]
    resp = await client.get(f"{DASHBOARDS_URL}/{dash_id}/data")
    assert resp.status_code == 200
    body = resp.json()
    assert body["dashboard"]["id"] == dash_id
    assert "widget_data" in body
    # Each widget should have computed data
    for wid in body["dashboard"]["widgets"]:
        assert wid["id"] in body["widget_data"]


@pytest.mark.asyncio
async def test_get_dashboard_data_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.get(
        f"{DASHBOARDS_URL}/00000000-0000-0000-0000-000000000000/data"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_dashboard_name(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    create = await client.post(DASHBOARDS_URL, json={
        "name": "Old Name",
        "dataset_id": ds_id,
    })
    dash_id = create.json()["id"]
    resp = await client.patch(f"{DASHBOARDS_URL}/{dash_id}", json={"name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_update_dashboard_widgets(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    create = await client.post(DASHBOARDS_URL, json={
        "name": "Widget Update",
        "dataset_id": ds_id,
    })
    dash_id = create.json()["id"]
    new_widgets = [
        {
            "id": "w_new",
            "type": "table",
            "title": "Data Table",
            "position": {"x": 0, "y": 0, "w": 6, "h": 4},
            "color": "#6366f1",
        },
    ]
    resp = await client.patch(
        f"{DASHBOARDS_URL}/{dash_id}",
        json={"widgets": new_widgets},
    )
    assert resp.status_code == 200
    assert len(resp.json()["widgets"]) == 1
    assert resp.json()["widgets"][0]["id"] == "w_new"


@pytest.mark.asyncio
async def test_update_dashboard_description(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    create = await client.post(DASHBOARDS_URL, json={
        "name": "Desc Test",
        "dataset_id": ds_id,
    })
    dash_id = create.json()["id"]
    resp = await client.patch(
        f"{DASHBOARDS_URL}/{dash_id}",
        json={"description": "Updated description"},
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"


@pytest.mark.asyncio
async def test_update_dashboard_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.patch(
        f"{DASHBOARDS_URL}/00000000-0000-0000-0000-000000000000",
        json={"name": "Nope"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_dashboard(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    ds_id = await _upload_dataset(client)
    create = await client.post(DASHBOARDS_URL, json={
        "name": "Delete Me",
        "dataset_id": ds_id,
    })
    dash_id = create.json()["id"]
    resp = await client.delete(f"{DASHBOARDS_URL}/{dash_id}")
    assert resp.status_code == 204
    # Verify deletion
    get_resp = await client.get(f"{DASHBOARDS_URL}/{dash_id}/data")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_dashboard_not_found(client):
    await client.post(REGISTER_URL, json=BASE_USER)
    resp = await client.delete(
        f"{DASHBOARDS_URL}/00000000-0000-0000-0000-000000000000"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dashboard_requires_auth(client):
    resp = await client.post(DASHBOARDS_URL, json={"name": "Nope", "dataset_id": str("x" * 36)})
    assert resp.status_code == 401
