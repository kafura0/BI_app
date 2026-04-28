import uuid
from datetime import datetime
from pydantic import BaseModel


class AnalyticsEventOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID | None
    event_type: str
    event_data: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyMetric(BaseModel):
    date: str
    value: int


class UsageStatsOut(BaseModel):
    organization_id: uuid.UUID
    period_days: int
    total_queries: int
    total_datasets: int
    total_dashboard_views: int
    active_users: int
    queries_by_day: list[DailyMetric]
    top_users: list[dict]
    plan: str
    queries_remaining_today: int
