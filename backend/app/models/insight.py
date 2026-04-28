import uuid
from sqlalchemy import String, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base, TimestampMixin


class Insight(Base, TimestampMixin):
    """
    Stores an AI-generated insight for a user query.
    response schema:
    {
        "explanation": "str",
        "key_metrics": [{"label": "str", "value": "any", "change": "str"}],
        "suggested_actions": ["str"],
        "chart_data": [...]  # optional
    }
    """
    __tablename__ = "insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    # Cached for billing
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="insights")  # noqa: F821
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="insights")  # noqa: F821
    user: Mapped["User"] = relationship("User", back_populates="insights")  # noqa: F821

    __table_args__ = (
        Index("ix_insights_org_user", "organization_id", "user_id"),
        Index("ix_insights_created_at", "organization_id", "created_at"),
    )
