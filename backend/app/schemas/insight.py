import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class KeyMetric(BaseModel):
    label: str
    value: str | float | int
    change: str | None = None
    trend: str | None = None  # up, down, neutral


class InsightResponse(BaseModel):
    explanation: str
    key_metrics: list[KeyMetric]
    suggested_actions: list[str]
    confidence: float | None = None


class InsightRequest(BaseModel):
    query: str
    dataset_id: uuid.UUID | None = None

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Query must be at least 5 characters")
        if len(v) > 1000:
            raise ValueError("Query must not exceed 1000 characters")
        return v


class InsightCreate(BaseModel):
    model_config = {"protected_namespaces": ()}

    organization_id: uuid.UUID
    user_id: uuid.UUID
    dataset_id: uuid.UUID | None
    query: str
    response: dict
    model_used: str
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int


class InsightOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}

    id: uuid.UUID
    dataset_id: uuid.UUID | None
    user_id: uuid.UUID
    query: str
    response: dict
    model_used: str
    tokens_used: int
    created_at: datetime


class InsightListOut(BaseModel):
    items: list[InsightOut]
    total: int
