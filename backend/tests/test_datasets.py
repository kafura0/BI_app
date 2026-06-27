"""Tests for dataset endpoints: upload, list, get, delete."""
import pytest
from io import BytesIO

DATASETS_URL = "/api/v1/datasets"

REGISTER_URL = "/api/v1/auth/register"
BASE_USER = {
    "email": "datauser@example.com",
    "password": "DataPass1",
    "full_name": "Data Analyst",
    "organization": {"name": "Data Org", "slug": "data-org"},
}

CSV_CONTENT = b"name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago\n"


def _register(client):
    return client.post(REGISTER_URL, json=BASE_USER)


@pytest.mark.asyncio
async def test_upload_dataset_success(client):
    await _register(client)
    resp = await client.post(
        DATASETS_URL,
        data={"name": "People"},
        files={"file": ("test.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "People"
    assert body["file_type"] == "csv"
    assert body["row_count"] == 3
    assert body["column_count"] == 3
    assert body["status"] == "ready"
    assert "schema_definition" in body
    assert "statistics" in body
    assert body["file_size_bytes"] > 0


@pytest.mark.asyncio
async def test_upload_dataset_schema_detection(client):
    await _register(client)
    csv = b"revenue,date,is_active\n1000,2024-01-01,true\n2500,2024-02-01,false\n"
    resp = await client.post(
        DATASETS_URL,
        data={"name": "Schema Test"},
        files={"file": ("test.csv", BytesIO(csv), "text/csv")},
    )
    assert resp.status_code == 201
    cols = resp.json()["schema_definition"]["columns"]
    types = {c["name"]: c["dtype"] for c in cols}
    assert types.get("revenue") == "numeric"
    assert types.get("date") == "datetime"
    assert types.get("is_active") == "boolean"


@pytest.mark.asyncio
async def test_upload_dataset_missing_name(client):
    await _register(client)
    resp = await client.post(
        DATASETS_URL,
        files={"file": ("test.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_dataset_empty_file(client):
    await _register(client)
    resp = await client.post(
        DATASETS_URL,
        data={"name": "Empty"},
        files={"file": ("empty.csv", BytesIO(b""), "text/csv")},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_dataset_unsupported_type(client):
    await _register(client)
    resp = await client.post(
        DATASETS_URL,
        data={"name": "Bad"},
        files={"file": ("data.pdf", BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_list_datasets_empty(client):
    await _register(client)
    resp = await client.get(DATASETS_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["page"] == 1
    assert body["page_size"] == 20


@pytest.mark.asyncio
async def test_list_datasets_pagination(client):
    await _register(client)
    for i in range(3):
        name = f"DS {i}"
        csv = b"x,y\n1,2\n"
        await client.post(
            DATASETS_URL,
            data={"name": name},
            files={"file": ("t.csv", BytesIO(csv), "text/csv")},
        )
    resp = await client.get(DATASETS_URL, params={"page": 1, "page_size": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["page_size"] == 2

    resp2 = await client.get(DATASETS_URL, params={"page": 2, "page_size": 2})
    assert len(resp2.json()["items"]) == 1


@pytest.mark.asyncio
async def test_get_dataset_by_id(client):
    await _register(client)
    create = await client.post(
        DATASETS_URL,
        data={"name": "Get Test"},
        files={"file": ("t.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    ds_id = create.json()["id"]
    resp = await client.get(f"{DATASETS_URL}/{ds_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == ds_id
    assert resp.json()["name"] == "Get Test"


@pytest.mark.asyncio
async def test_get_dataset_not_found(client):
    await _register(client)
    resp = await client.get(f"{DATASETS_URL}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_dataset(client):
    await _register(client)
    create = await client.post(
        DATASETS_URL,
        data={"name": "To Delete"},
        files={"file": ("t.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    ds_id = create.json()["id"]
    resp = await client.delete(f"{DATASETS_URL}/{ds_id}")
    assert resp.status_code == 204
    # Verify it's gone
    get_resp = await client.get(f"{DATASETS_URL}/{ds_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_dataset_not_found(client):
    await _register(client)
    resp = await client.delete(f"{DATASETS_URL}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dataset_requires_auth(client):
    resp = await client.post(
        DATASETS_URL,
        data={"name": "No Auth"},
        files={"file": ("t.csv", BytesIO(CSV_CONTENT), "text/csv")},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_datasets_requires_auth(client):
    resp = await client.get(DATASETS_URL)
    assert resp.status_code == 401
