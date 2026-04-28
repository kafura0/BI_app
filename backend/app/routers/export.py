import uuid
from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_tenant, TenantContext
from ..services import export_service

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/datasets/{dataset_id}/csv")
async def export_dataset_as_csv(
    dataset_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    csv_bytes = await export_service.export_dataset_csv(db, dataset_id, tenant.organization_id)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="dataset-{dataset_id}.csv"'},
    )


@router.get("/datasets/{dataset_id}/pdf")
async def export_dataset_as_pdf(
    dataset_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    pdf_bytes = await export_service.export_dataset_pdf(db, dataset_id, tenant.organization_id)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="dataset-{dataset_id}.pdf"'},
    )


@router.get("/dashboards/{dashboard_id}/pdf")
async def export_dashboard_as_pdf(
    dashboard_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    pdf_bytes = await export_service.export_dashboard_pdf(db, dashboard_id, tenant.organization_id)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="dashboard-{dashboard_id}.pdf"'},
    )
