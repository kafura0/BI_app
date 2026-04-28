import uuid
from typing import Any
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from ..models.dashboard import Dashboard
from ..models.dataset import DatasetRow
from ..schemas.dashboard import DashboardOut, DashboardCreate, DashboardUpdate, DashboardDataOut, WidgetConfig
from .dataset_service import get_dataset_or_404


def _auto_generate_widgets(schema_def: dict) -> list[dict]:
    """Heuristically create useful widgets based on detected column types."""
    columns = schema_def.get("columns", [])
    numeric_cols = [c["name"] for c in columns if c["is_numeric"]]
    date_cols = [c["name"] for c in columns if c["dtype"] == "datetime"]
    string_cols = [c["name"] for c in columns if c["dtype"] == "string"]

    widgets = []
    widget_id = lambda: str(uuid.uuid4())[:8]

    # Metric cards for first 3 numeric columns
    for i, col in enumerate(numeric_cols[:3]):
        widgets.append({
            "id": widget_id(),
            "type": "metric_card",
            "title": col.replace("_", " ").title(),
            "y_column": col,
            "aggregation": "sum",
            "position": {"x": i * 4, "y": 0, "w": 4, "h": 2},
            "color": "#6366f1",
        })

    # Line chart: first date col vs first numeric
    if date_cols and numeric_cols:
        widgets.append({
            "id": widget_id(),
            "type": "line_chart",
            "title": f"{numeric_cols[0].replace('_', ' ').title()} Over Time",
            "x_column": date_cols[0],
            "y_column": numeric_cols[0],
            "aggregation": "sum",
            "position": {"x": 0, "y": 2, "w": 8, "h": 4},
            "color": "#6366f1",
        })

    # Bar chart: first string col vs first numeric
    if string_cols and numeric_cols:
        widgets.append({
            "id": widget_id(),
            "type": "bar_chart",
            "title": f"{numeric_cols[0].replace('_', ' ').title()} by {string_cols[0].replace('_', ' ').title()}",
            "x_column": string_cols[0],
            "y_column": numeric_cols[0],
            "aggregation": "sum",
            "position": {"x": 8, "y": 2, "w": 4, "h": 4},
            "color": "#8b5cf6",
        })

    # Forecast widget if time series possible
    if date_cols and numeric_cols:
        widgets.append({
            "id": widget_id(),
            "type": "forecast",
            "title": f"Forecast: {numeric_cols[0].replace('_', ' ').title()}",
            "x_column": date_cols[0],
            "y_column": numeric_cols[0],
            "aggregation": "sum",
            "position": {"x": 0, "y": 6, "w": 12, "h": 4},
            "color": "#10b981",
        })

    return widgets


async def _load_dataframe(db: AsyncSession, dataset_id: uuid.UUID) -> pd.DataFrame:
    result = await db.execute(
        select(DatasetRow.data).where(DatasetRow.dataset_id == dataset_id).order_by(DatasetRow.row_index)
    )
    rows = result.scalars().all()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def _compute_widget_data(df: pd.DataFrame, widget: dict) -> Any:
    w_type = widget.get("type")
    x_col = widget.get("x_column")
    y_col = widget.get("y_column")
    agg = widget.get("aggregation", "sum")

    if df.empty:
        return []

    agg_funcs = {"sum": "sum", "avg": "mean", "count": "count", "max": "max", "min": "min"}
    agg_fn = agg_funcs.get(agg, "sum")

    if w_type == "metric_card":
        if y_col and y_col in df.columns:
            numeric_series = pd.to_numeric(df[y_col], errors="coerce")
            val = getattr(numeric_series, agg_fn)()
            return {"value": round(float(val), 2) if not pd.isna(val) else 0}
        return {"value": 0}

    elif w_type in ("line_chart", "bar_chart"):
        if not x_col or not y_col or x_col not in df.columns or y_col not in df.columns:
            return []
        try:
            df[y_col] = pd.to_numeric(df[y_col], errors="coerce")
            grouped = df.groupby(x_col)[y_col].agg(agg_fn).reset_index()
            grouped.columns = ["x", "value"]
            grouped = grouped.dropna().sort_values("x")
            return grouped.to_dict(orient="records")
        except Exception:
            return []

    elif w_type == "forecast":
        if not x_col or not y_col or x_col not in df.columns or y_col not in df.columns:
            return []
        try:
            df[y_col] = pd.to_numeric(df[y_col], errors="coerce")
            df[x_col] = pd.to_datetime(df[x_col], errors="coerce")
            ts = df.groupby(x_col)[y_col].agg(agg_fn).reset_index().dropna().sort_values(x_col)
            # Simple linear regression forecast
            from sklearn.linear_model import LinearRegression
            import numpy as np
            X = np.arange(len(ts)).reshape(-1, 1)
            y = ts[y_col].values
            model = LinearRegression().fit(X, y)
            future_X = np.arange(len(ts), len(ts) + 6).reshape(-1, 1)
            forecast = model.predict(future_X)
            history = [{"x": str(r[x_col].date()), "value": float(r[y_col]), "type": "actual"} for _, r in ts.iterrows()]
            last_date = ts[x_col].max()
            freq = pd.infer_freq(ts[x_col]) or "M"
            future_dates = pd.date_range(start=last_date, periods=7, freq=freq)[1:]
            predicted = [{"x": str(d.date()), "value": round(float(v), 2), "type": "forecast"} for d, v in zip(future_dates, forecast)]
            return history + predicted
        except Exception:
            return []

    elif w_type == "table":
        return df.head(50).where(pd.notnull(df), None).to_dict(orient="records")

    return []


async def auto_create_dashboard(db: AsyncSession, organization_id: uuid.UUID, dataset_id: uuid.UUID, created_by: uuid.UUID) -> DashboardOut:
    dataset = await get_dataset_or_404(db, dataset_id, organization_id)
    widgets = _auto_generate_widgets(dataset.schema_definition)

    dashboard = Dashboard(
        organization_id=organization_id,
        dataset_id=dataset_id,
        created_by=created_by,
        name=f"{dataset.name} — Auto Dashboard",
        widgets=widgets,
        is_default=True,
    )
    db.add(dashboard)
    await db.flush()
    return DashboardOut.model_validate(dashboard)


async def get_dashboard_with_data(db: AsyncSession, dashboard_id: uuid.UUID, organization_id: uuid.UUID) -> DashboardDataOut:
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.organization_id == organization_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")

    df = await _load_dataframe(db, dashboard.dataset_id)
    widget_data = {w["id"]: _compute_widget_data(df, w) for w in dashboard.widgets}

    return DashboardDataOut(dashboard=DashboardOut.model_validate(dashboard), widget_data=widget_data)


async def update_dashboard(db: AsyncSession, dashboard_id: uuid.UUID, organization_id: uuid.UUID, data: DashboardUpdate) -> DashboardOut:
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.organization_id == organization_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")

    if data.name is not None:
        dashboard.name = data.name
    if data.description is not None:
        dashboard.description = data.description
    if data.widgets is not None:
        dashboard.widgets = [w.model_dump() for w in data.widgets]
    if data.is_public is not None:
        dashboard.is_public = data.is_public

    await db.flush()
    return DashboardOut.model_validate(dashboard)
