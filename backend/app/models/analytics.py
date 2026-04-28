import uuid
from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base, TimestampMixin


class AnalyticsEvent(Base, TimestampMixin):
    """
    Platform usage telemetry scoped to a tenant.
    event_type examples: dataset_uploaded, dashboard_viewed, insight_queried,
                         user_login, export_downloaded
    """
    __tablename__ = "analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Flexible payload: resource_id, resource_type, metadata, etc.
    event_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="analytics_events")  # noqa: F821
    user: Mapped["User"] = relationship("User", back_populates="analytics_events")  # noqa: F821

    __table_args__ = (
        Index("ix_analytics_org_event", "organization_id", "event_type"),
        Index("ix_analytics_org_created", "organization_id", "created_at"),
        Index("ix_analytics_user", "user_id", "created_at"),
    )
