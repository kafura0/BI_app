"""
Export service: CSV and PDF generation for datasets and dashboards.
"""
import io
import uuid
from datetime import datetime

import pandas as pd
from fpdf import FPDF
from sqlalchemy.ext.asyncio import AsyncSession

from .dataset_service import get_dataset_or_404
from .dashboard_service import get_dashboard_with_data
from ..models.dataset import DatasetRow
from sqlalchemy import select


async def export_dataset_csv(db: AsyncSession, dataset_id: uuid.UUID, organization_id: uuid.UUID) -> bytes:
    dataset = await get_dataset_or_404(db, dataset_id, organization_id)

    result = await db.execute(
        select(DatasetRow.data)
        .where(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index)
    )
    rows = result.scalars().all()
    if not rows:
        return b""

    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    return output.getvalue().encode("utf-8")


async def export_dataset_pdf(db: AsyncSession, dataset_id: uuid.UUID, organization_id: uuid.UUID) -> bytes:
    dataset = await get_dataset_or_404(db, dataset_id, organization_id)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(99, 102, 241)  # indigo
    pdf.cell(0, 12, dataset.name, ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC", ln=True)
    pdf.ln(4)

    # Dataset stats
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "Dataset Overview", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)
    pdf.cell(0, 6, f"Rows: {dataset.row_count:,}", ln=True)
    pdf.cell(0, 6, f"Columns: {dataset.column_count}", ln=True)
    pdf.cell(0, 6, f"File type: {dataset.file_type.upper()}", ln=True)
    pdf.ln(4)

    # Column stats
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "Column Statistics", ln=True)

    for col_name, col_stat in dataset.statistics.items():
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 6, f"{col_name} ({col_stat.get('dtype', 'unknown')})", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(71, 85, 105)

        if col_stat.get("dtype") == "numeric":
            fmt = lambda v: f"{v:.2f}" if isinstance(v, (int, float)) else "N/A"
            pdf.cell(0, 5, f"  Min: {fmt(col_stat.get('min'))}  |  Max: {fmt(col_stat.get('max'))}  |  Mean: {fmt(col_stat.get('mean'))}  |  Nulls: {col_stat.get('null_count', 0)}", ln=True)
        else:
            pdf.cell(0, 5, f"  Unique values: {col_stat.get('unique_count', 'N/A')}  |  Nulls: {col_stat.get('null_count', 0)}", ln=True)
        pdf.ln(1)

    return pdf.output()


async def export_dashboard_pdf(db: AsyncSession, dashboard_id: uuid.UUID, organization_id: uuid.UUID) -> bytes:
    data = await get_dashboard_with_data(db, dashboard_id, organization_id)
    dashboard = data.dashboard

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(99, 102, 241)
    pdf.cell(0, 12, dashboard.name, ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC", ln=True)
    pdf.ln(4)

    # Each widget summary
    for widget in dashboard.widgets:
        widget_data = data.widget_data.get(widget["id"], [])

        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 8, widget.get("title", "Widget"), ln=True)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(71, 85, 105)

        w_type = widget.get("type")
        if w_type == "metric_card" and isinstance(widget_data, dict):
            val = widget_data.get("value", 0)
            pdf.cell(0, 6, f"Value: {val:,.2f}" if isinstance(val, (int, float)) else f"Value: {val}", ln=True)
        elif isinstance(widget_data, list) and widget_data:
            pdf.cell(0, 6, f"Data points: {len(widget_data)}", ln=True)
            # First 5 rows
            for row in widget_data[:5]:
                if isinstance(row, dict):
                    line = "  " + "  |  ".join(f"{k}: {v}" for k, v in list(row.items())[:4])
                    pdf.cell(0, 5, line[:80], ln=True)
        pdf.ln(3)

    return pdf.output()
