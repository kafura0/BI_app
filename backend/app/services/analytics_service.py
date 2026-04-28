import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ..models.analytics import AnalyticsEvent
from ..models.dataset import Dataset
from ..models.insight import Insight
from ..models.organization import Organization, PlanType
from ..schemas.analytics import UsageStatsOut, DailyMetric
from ..config import get_settings

settings = get_settings()

DAILY_QUERY_LIMITS = {
    PlanType.free: settings.FREE_PLAN_MAX_QUERIES_PER_DAY,
    PlanType.pro: settings.PRO_PLAN_MAX_QUERIES_PER_DAY,
    PlanType.enterprise: 9999,
}


async def track_event(
    db: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID | None,
    event_type: str,
    event_data: dict | None = None,
) -> None:
    event = AnalyticsEvent(
        organization_id=organization_id,
        user_id=user_id,
        event_type=event_type,
        event_data=event_data or {},
    )
    db.add(event)
    # No flush needed — caller commits


async def check_daily_query_limit(db: AsyncSession, organization_id: uuid.UUID, org: Organization) -> None:
    limit = DAILY_QUERY_LIMITS.get(org.plan, settings.FREE_PLAN_MAX_QUERIES_PER_DAY)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count()).where(
            and_(
                AnalyticsEvent.organization_id == organization_id,
                AnalyticsEvent.event_type == "insight_queried",
                AnalyticsEvent.created_at >= today_start,
            )
        )
    )
    used = result.scalar_one()
    if used >= limit:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI query limit of {limit} reached. Upgrade your plan for more.",
        )


async def get_usage_stats(db: AsyncSession, organization_id: uuid.UUID, period_days: int = 30) -> UsageStatsOut:
    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    org_result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = org_result.scalar_one()

    # Total queries
    queries_result = await db.execute(
        select(func.count()).where(
            and_(AnalyticsEvent.organization_id == organization_id, AnalyticsEvent.event_type == "insight_queried", AnalyticsEvent.created_at >= since)
        )
    )
    total_queries = queries_result.scalar_one()

    # Total datasets
    datasets_result = await db.execute(
        select(func.count()).where(Dataset.organization_id == organization_id)
    )
    total_datasets = datasets_result.scalar_one()

    # Dashboard views
    views_result = await db.execute(
        select(func.count()).where(
            and_(AnalyticsEvent.organization_id == organization_id, AnalyticsEvent.event_type == "dashboard_viewed", AnalyticsEvent.created_at >= since)
        )
    )
    total_views = views_result.scalar_one()

    # Active users
    users_result = await db.execute(
        select(func.count(func.distinct(AnalyticsEvent.user_id))).where(
            and_(AnalyticsEvent.organization_id == organization_id, AnalyticsEvent.created_at >= since)
        )
    )
    active_users = users_result.scalar_one()

    # Queries by day
    daily_result = await db.execute(
        select(
            func.date_trunc("day", AnalyticsEvent.created_at).label("day"),
            func.count().label("count"),
        )
        .where(
            and_(AnalyticsEvent.organization_id == organization_id, AnalyticsEvent.event_type == "insight_queried", AnalyticsEvent.created_at >= since)
        )
        .group_by("day")
        .order_by("day")
    )
    queries_by_day = [DailyMetric(date=str(row.day.date()), value=row.count) for row in daily_result]

    # Today's usage for limit display
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(func.count()).where(
            and_(AnalyticsEvent.organization_id == organization_id, AnalyticsEvent.event_type == "insight_queried", AnalyticsEvent.created_at >= today_start)
        )
    )
    used_today = today_result.scalar_one()
    limit = DAILY_QUERY_LIMITS.get(org.plan, settings.FREE_PLAN_MAX_QUERIES_PER_DAY)

    return UsageStatsOut(
        organization_id=organization_id,
        period_days=period_days,
        total_queries=total_queries,
        total_datasets=total_datasets,
        total_dashboard_views=total_views,
        active_users=active_users,
        queries_by_day=queries_by_day,
        top_users=[],
        plan=org.plan.value,
        queries_remaining_today=max(0, limit - used_today),
    )
