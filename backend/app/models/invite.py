import uuid
import enum
from sqlalchemy import String, ForeignKey, Enum as SAEnum, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base, TimestampMixin
from .organization import MemberRole


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"
    revoked = "revoked"


class Invite(Base, TimestampMixin):
    __tablename__ = "invites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[MemberRole] = mapped_column(SAEnum(MemberRole), default=MemberRole.analyst, nullable=False)
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    status: Mapped[InviteStatus] = mapped_column(SAEnum(InviteStatus), default=InviteStatus.pending, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="invites")  # noqa: F821

    __table_args__ = (
        Index("ix_invites_token", "token"),
        Index("ix_invites_org_email", "organization_id", "email"),
    )
