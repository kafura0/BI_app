import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..middleware.auth import get_current_tenant, require_analyst, TenantContext
from ..models.organization import Organization
from ..models.dataset import Dataset
from ..schemas.dataset import DatasetOut, DatasetListOut
from ..rate_limit import limiter
from ..services import dataset_service, analytics_service

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("", response_model=DatasetOut, status_code=201)
@limiter.limit("5/minute")
async def upload_dataset(
    request: Request,
    tenant: Annotated[TenantContext, Depends(require_analyst)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str | None = Form(None),
) -> DatasetOut:
    org_result = await db.execute(select(Organization).where(Organization.id == tenant.organization_id))
    org = org_result.scalar_one()

    result = await dataset_service.process_upload(db, org, tenant.user_id, file, name, description)
    await analytics_service.track_event(db, tenant.organization_id, tenant.user_id, "dataset_uploaded", {"dataset_id": str(result.id)})
    return result


@router.get("", response_model=DatasetListOut)
async def list_datasets(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> DatasetListOut:
    return await dataset_service.list_datasets(db, tenant.organization_id, page, page_size)


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(
    dataset_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DatasetOut:
    dataset = await dataset_service.get_dataset_or_404(db, dataset_id, tenant.organization_id)
    return DatasetOut.model_validate(dataset)


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(require_analyst)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    dataset = await dataset_service.get_dataset_or_404(db, dataset_id, tenant.organization_id)
    await db.delete(dataset)
    await analytics_service.track_event(db, tenant.organization_id, tenant.user_id, "dataset_deleted", {"dataset_id": str(dataset_id)})
