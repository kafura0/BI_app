import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class ColumnDefinition(BaseModel):
    name: str
    dtype: str           # numeric, string, datetime, boolean
    nullable: bool
    sample_values: list[Any]
    is_numeric: bool


class DatasetCreate(BaseModel):
    name: str
    description: str | None = None


class DatasetOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    uploaded_by: uuid.UUID | None
    name: str
    description: str | None
    file_type: str
    file_size_bytes: int
    row_count: int
    column_count: int
    schema_definition: dict
    status: str
    statistics: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetListOut(BaseModel):
    items: list[DatasetOut]
    total: int
    page: int
    page_size: int


class DatasetStatsOut(BaseModel):
    dataset_id: uuid.UUID
    row_count: int
    column_count: int
    numeric_columns: list[str]
    datetime_columns: list[str]
    string_columns: list[str]
    summary: dict  # per-column stats
