import uuid
from sqlalchemy import String, Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base, TimestampMixin


class Dashboard(Base, TimestampMixin):
    """
    Dashboard config is stored as JSONB. Each dashboard has an array of widgets.
    Widget schema:
    {
        "id": "uuid",
        "type": "line_chart|bar_chart|metric_card|table|forecast",
        "title": "str",
        "x_column": "str",
        "y_column": "str",
        "aggregation": "sum|avg|count|max|min",
        "filters": {},
        "position": {"x": 0, "y": 0, "w": 6, "h": 4}
    }
    """
    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    widgets: Mapped[list] = mapped_column(JSONB, default=list)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="dashboards")  # noqa: F821
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="dashboards")  # noqa: F821

    __table_args__ = (
        Index("ix_dashboards_org_dataset", "organization_id", "dataset_id"),
    )
