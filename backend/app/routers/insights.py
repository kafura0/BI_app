import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..middleware.auth import get_current_tenant, TenantContext
from ..models.insight import Insight
from ..models.organization import Organization
from ..schemas.insight import InsightRequest, InsightOut, InsightListOut
from ..services import analytics_service

router = APIRouter(prefix="/insights", tags=["AI Insights"])


@router.post("", response_model=InsightOut, status_code=201)
async def create_insight(
    data: InsightRequest,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InsightOut:
    # Check rate limit
    org_result = await db.execute(select(Organization).where(Organization.id == tenant.organization_id))
    org = org_result.scalar_one()
    await analytics_service.check_daily_query_limit(db, tenant.organization_id, org)

    # Lazy import to keep startup fast
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../ai-engine"))
    from services.insight_service import generate_insight  # type: ignore

    sample_df = None
    if data.dataset_id:
        from ..services.dataset_service import get_dataset_sample
        sample_df = await get_dataset_sample(db, data.dataset_id, tenant.organization_id)

    insight_data = await generate_insight(query=data.query, df=sample_df)

    insight = Insight(
        organization_id=tenant.organization_id,
        dataset_id=data.dataset_id,
        user_id=tenant.user_id,
        query=data.query,
        response=insight_data["response"],
        model_used=insight_data["model"],
        tokens_used=insight_data["tokens_used"],
        prompt_tokens=insight_data["prompt_tokens"],
        completion_tokens=insight_data["completion_tokens"],
    )
    db.add(insight)
    await db.flush()

    await analytics_service.track_event(
        db, tenant.organization_id, tenant.user_id,
        "insight_queried",
        {"insight_id": str(insight.id), "dataset_id": str(data.dataset_id) if data.dataset_id else None},
    )

    return InsightOut.model_validate(insight)


@router.get("", response_model=InsightListOut)
async def list_insights(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> InsightListOut:
    offset = (page - 1) * page_size
    count_result = await db.execute(
        select(func.count()).where(Insight.organization_id == tenant.organization_id)
    )
    total = count_result.scalar_one()
    result = await db.execute(
        select(Insight)
        .where(Insight.organization_id == tenant.organization_id)
        .order_by(Insight.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return InsightListOut(items=[InsightOut.model_validate(i) for i in result.scalars().all()], total=total)


@router.get("/{insight_id}", response_model=InsightOut)
async def get_insight(
    insight_id: uuid.UUID,
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InsightOut:
    result = await db.execute(
        select(Insight).where(Insight.id == insight_id, Insight.organization_id == tenant.organization_id)
    )
    insight = result.scalar_one_or_none()
    if not insight:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    return InsightOut.model_validate(insight)
