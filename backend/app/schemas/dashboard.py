import uuid
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel


class WidgetPosition(BaseModel):
    x: int = 0
    y: int = 0
    w: int = 6
    h: int = 4


class WidgetConfig(BaseModel):
    id: str
    type: Literal["line_chart", "bar_chart", "pie_chart", "metric_card", "table", "forecast"]
    title: str
    x_column: str | None = None
    y_column: str | None = None
    group_by: str | None = None
    aggregation: Literal["sum", "avg", "count", "max", "min"] = "sum"
    filters: dict[str, Any] = {}
    position: WidgetPosition = WidgetPosition()
    color: str = "#6366f1"


class DashboardCreate(BaseModel):
    name: str
    description: str | None = None
    dataset_id: uuid.UUID
    widgets: list[WidgetConfig] = []


class DashboardUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    widgets: list[WidgetConfig] | None = None
    is_public: bool | None = None


class DashboardOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    dataset_id: uuid.UUID
    created_by: uuid.UUID | None
    name: str
    description: str | None
    widgets: list[dict]
    is_default: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardDataOut(BaseModel):
    dashboard: DashboardOut
    widget_data: dict[str, Any]  # widget_id -> chart data
