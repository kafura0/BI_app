import uuid
import enum
from sqlalchemy import String, Integer, BigInteger, ForeignKey, Text, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base, TimestampMixin


class DatasetStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class Dataset(Base, TimestampMixin):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # csv, xlsx
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    # Auto-detected schema: [{name, dtype, sample_values}]
    schema_definition: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[DatasetStatus] = mapped_column(SAEnum(DatasetStatus), default=DatasetStatus.pending, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Aggregate statistics cached for fast retrieval
    statistics: Mapped[dict] = mapped_column(JSONB, default=dict)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="datasets")  # noqa: F821
    rows: Mapped[list["DatasetRow"]] = relationship("DatasetRow", back_populates="dataset", cascade="all, delete-orphan")
    dashboards: Mapped[list["Dashboard"]] = relationship("Dashboard", back_populates="dataset")  # noqa: F821
    insights: Mapped[list["Insight"]] = relationship("Insight", back_populates="dataset")  # noqa: F821

    __table_args__ = (
        Index("ix_datasets_org_status", "organization_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Dataset id={self.id} name={self.name} org={self.organization_id}>"


class DatasetRow(Base):
    __tablename__ = "dataset_rows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="rows")

    __table_args__ = (
        Index("ix_dataset_rows_dataset_id", "dataset_id"),
        Index("ix_dataset_rows_dataset_row", "dataset_id", "row_index"),
    )
