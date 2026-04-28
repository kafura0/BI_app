import uuid
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..middleware.auth import get_current_tenant, require_analyst, TenantContext
from ..models.dashboard import Dashboard
from ..schemas.dashboard import DashboardOut, DashboardCreate, DashboardUpdate, DashboardDataOut
from ..services import dashboard_service, analytics_service

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])


@router.post("", response_model=DashboardOut, status_code=201)
async def create_dashboard(
    data: DashboardCreate,
    tenant: Annotated[TenantContext, Depends(require_analyst)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardOut:
    if data.widgets:
        # Manual widget creation
        from ..models.dashboard import Dashboard as DashboardModel
        dashboard = DashboardModel(
            organization_id=tenant.organization_id,
            dataset_id=data.dataset_id,
            created_by=tenant.user_id,
            name=data.name,
            description=data.description,
            widgets=[w.model_dump() for w in data.widgets],
        )
        db.add(dashboard)
        await db.flush()
        return DashboardOut.model_validate(dashboard)
    else:
        # Auto-generate widgets from dataset schema
        return await dashboard_service.auto_create_dashboard(db, tenant.organization_id, data.dataset_id, tenant.user_id)


@router.get("", response_model=list[DashboardOut])
async def list_dashboards(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DashboardOut]:
    result = await db.execute(
        select(Dashboard)
        .where(Dashboard.organization_id == tenant.organization_id)
        .order_by(Dashboard.created_at.desc())
    )
    return [DashboardOut.model_validate(d) for d in result.scalars().all()]


@router.get("/{dashboard_id}/data", response_model=DashboardDataOut)
async def get_dashboard_data(
    dashboard_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardDataOut:
    result = await dashboard_service.get_dashboard_with_data(db, dashboard_id, tenant.organization_id)
    await analytics_service.track_event(db, tenant.organization_id, tenant.user_id, "dashboard_viewed", {"dashboard_id": str(dashboard_id)})
    return result


@router.patch("/{dashboard_id}", response_model=DashboardOut)
async def update_dashboard(
    dashboard_id: uuid.UUID,
    data: DashboardUpdate,
    tenant: Annotated[TenantContext, Depends(require_analyst)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardOut:
    return await dashboard_service.update_dashboard(db, dashboard_id, tenant.organization_id, data)


@router.delete("/{dashboard_id}", status_code=204)
async def delete_dashboard(
    dashboard_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(require_analyst)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.organization_id == tenant.organization_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    await db.delete(dashboard)
