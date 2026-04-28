from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_tenant, require_admin, TenantContext
from ..schemas.analytics import UsageStatsOut
from ..services.analytics_service import get_usage_stats

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/usage", response_model=UsageStatsOut)
async def get_org_usage(
    tenant: Annotated[TenantContext, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period_days: int = Query(30, ge=1, le=365),
) -> UsageStatsOut:
    return await get_usage_stats(db, tenant.organization_id, period_days)
