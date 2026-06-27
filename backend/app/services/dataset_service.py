import uuid
import io
import os
from typing import Any
import pandas as pd
import numpy as np
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..models.dataset import Dataset, DatasetRow, DatasetStatus
from ..models.organization import Organization, PlanType
from ..schemas.dataset import DatasetOut, DatasetListOut
from ..config import get_settings

settings = get_settings()

PLAN_LIMITS = {
    PlanType.free: {"max_datasets": settings.FREE_PLAN_MAX_DATASETS, "max_rows": settings.FREE_PLAN_MAX_ROWS},
    PlanType.pro: {"max_datasets": settings.PRO_PLAN_MAX_DATASETS, "max_rows": settings.PRO_PLAN_MAX_ROWS},
    PlanType.enterprise: {"max_datasets": 999, "max_rows": 10_000_000},
}


def _detect_dtype(series: pd.Series) -> str:
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    # Try parsing as datetime
    try:
        pd.to_datetime(series.dropna().head(5))
        return "datetime"
    except Exception:
        pass
    return "string"


def _build_schema(df: pd.DataFrame) -> list[dict]:
    schema = []
    for col in df.columns:
        dtype = _detect_dtype(df[col])
        sample = df[col].dropna().head(5).tolist()
        # Ensure JSON serializable
        sample = [str(v) if not isinstance(v, (int, float, bool, str, type(None))) else v for v in sample]
        schema.append({
            "name": col,
            "dtype": dtype,
            "nullable": bool(df[col].isna().any()),
            "sample_values": sample,
            "is_numeric": dtype == "numeric",
        })
    return schema


def _compute_statistics(df: pd.DataFrame) -> dict:
    stats: dict[str, Any] = {}
    for col in df.columns:
        col_stats: dict[str, Any] = {"dtype": _detect_dtype(df[col])}
        if pd.api.types.is_numeric_dtype(df[col]):
            col_stats.update({
                "min": float(df[col].min()) if not df[col].empty else None,
                "max": float(df[col].max()) if not df[col].empty else None,
                "mean": float(df[col].mean()) if not df[col].empty else None,
                "std": float(df[col].std()) if not df[col].empty else None,
                "null_count": int(df[col].isna().sum()),
            })
        else:
            col_stats.update({
                "unique_count": int(df[col].nunique()),
                "null_count": int(df[col].isna().sum()),
                "top_values": df[col].value_counts().head(5).to_dict(),
            })
        stats[col] = col_stats
    return stats


async def _check_plan_limits(db: AsyncSession, org: Organization, row_count: int) -> None:
    limits = PLAN_LIMITS.get(org.plan, PLAN_LIMITS[PlanType.free])

    count_result = await db.execute(
        select(func.count()).where(Dataset.organization_id == org.id, Dataset.status == DatasetStatus.ready)
    )
    current_count = count_result.scalar_one()

    if current_count >= limits["max_datasets"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Dataset limit reached for {org.plan.value} plan. Upgrade to add more datasets.",
        )
    if row_count > limits["max_rows"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"File has {row_count} rows, exceeding {org.plan.value} plan limit of {limits['max_rows']}.",
        )


async def process_upload(
    db: AsyncSession,
    org: Organization,
    uploaded_by: uuid.UUID,
    file: UploadFile,
    name: str,
    description: str | None,
) -> DatasetOut:
    # Validate file size
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    # Validate file type
    filename = file.filename or ""
    if filename.lower().endswith(".csv"):
        file_type = "csv"
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid CSV: {e}")
    elif filename.lower().endswith((".xlsx", ".xls")):
        file_type = "xlsx"
        try:
            df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid Excel: {e}")
    else:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only CSV and Excel files are supported")

    if df.empty:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File contains no data")

    # Sanitize column names
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    await _check_plan_limits(db, org, len(df))

    schema = _build_schema(df)
    statistics = _compute_statistics(df)

    dataset = Dataset(
        organization_id=org.id,
        uploaded_by=uploaded_by,
        name=name,
        description=description,
        file_type=file_type,
        file_size_bytes=len(content),
        row_count=len(df),
        column_count=len(df.columns),
        schema_definition={"columns": schema},
        status=DatasetStatus.ready,
        statistics=statistics,
    )
    db.add(dataset)
    await db.flush()

    # Batch insert rows (convert NaN to None for JSON)
    df = df.where(pd.notnull(df), None)
    batch_size = 500
    records = df.to_dict(orient="records")
    for i in range(0, len(records), batch_size):
        batch = [
            DatasetRow(dataset_id=dataset.id, row_index=idx + i, data=row)
            for idx, row in enumerate(records[i : i + batch_size])
        ]
        db.add_all(batch)
        await db.flush()

    return DatasetOut.model_validate(dataset)


async def get_dataset_or_404(db: AsyncSession, dataset_id: uuid.UUID, organization_id: uuid.UUID) -> Dataset:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.organization_id == organization_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return dataset


async def get_dataset_sample(db: AsyncSession, dataset_id: uuid.UUID, organization_id: uuid.UUID, n: int = 100) -> pd.DataFrame:
    dataset = await get_dataset_or_404(db, dataset_id, organization_id)
    result = await db.execute(
        select(DatasetRow.data)
        .where(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index)
        .limit(n)
    )
    rows = result.scalars().all()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


async def list_datasets(
    db: AsyncSession, organization_id: uuid.UUID, page: int = 1, page_size: int = 20, q: str | None = None
) -> DatasetListOut:
    offset = (page - 1) * page_size
    base_filter = Dataset.organization_id == organization_id
    if q:
        search_pattern = f"%{q}%"
        base_filter = base_filter & (Dataset.name.ilike(search_pattern) | Dataset.description.ilike(search_pattern))
    count_result = await db.execute(
        select(func.count()).where(base_filter)
    )
    total = count_result.scalar_one()
    result = await db.execute(
        select(Dataset)
        .where(base_filter)
        .order_by(Dataset.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    datasets = result.scalars().all()
    return DatasetListOut(
        items=[DatasetOut.model_validate(d) for d in datasets],
        total=total,
        page=page,
        page_size=page_size,
    )
