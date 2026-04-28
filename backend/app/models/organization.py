import uuid
import enum
from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base, TimestampMixin


class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class MemberRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan: Mapped[PlanType] = mapped_column(SAEnum(PlanType), default=PlanType.free, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Stripe
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="organization", cascade="all, delete-orphan")  # noqa: F821
    datasets: Mapped[list["Dataset"]] = relationship("Dataset", back_populates="organization")  # noqa: F821
    dashboards: Mapped[list["Dashboard"]] = relationship("Dashboard", back_populates="organization")  # noqa: F821
    insights: Mapped[list["Insight"]] = relationship("Insight", back_populates="organization")  # noqa: F821
    analytics_events: Mapped[list["AnalyticsEvent"]] = relationship("AnalyticsEvent", back_populates="organization")  # noqa: F821
    invites: Mapped[list["Invite"]] = relationship("Invite", back_populates="organization", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Organization id={self.id} slug={self.slug} plan={self.plan}>"


class Membership(Base, TimestampMixin):
    __tablename__ = "memberships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[MemberRole] = mapped_column(SAEnum(MemberRole), default=MemberRole.viewer, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="memberships")  # noqa: F821
    organization: Mapped["Organization"] = relationship("Organization", back_populates="memberships")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),
        Index("ix_memberships_org_user", "organization_id", "user_id"),
    )
