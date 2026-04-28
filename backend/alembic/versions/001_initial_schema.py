"""Initial schema — all tables

Revision ID: 001
Revises:
Create Date: 2026-04-19
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- ENUMS ---
    op.execute("CREATE TYPE plantype AS ENUM ('free', 'pro', 'enterprise')")
    op.execute("CREATE TYPE memberrole AS ENUM ('admin', 'analyst', 'viewer')")
    op.execute("CREATE TYPE datasetstatus AS ENUM ('pending', 'processing', 'ready', 'failed')")
    op.execute("CREATE TYPE invitestatus AS ENUM ('pending', 'accepted', 'expired', 'revoked')")

    # --- USERS ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_superadmin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_email_active", "users", ["email", "is_active"])

    # --- ORGANIZATIONS ---
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("plan", sa.Enum("free", "pro", "enterprise", name="plantype"), nullable=False, server_default="free"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_status", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug"),
        sa.UniqueConstraint("stripe_customer_id"),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"])

    # --- MEMBERSHIPS ---
    op.create_table(
        "memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Enum("admin", "analyst", "viewer", name="memberrole"), nullable=False, server_default="viewer"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),
    )
    op.create_index("ix_memberships_org_user", "memberships", ["organization_id", "user_id"])

    # --- DATASETS ---
    op.create_table(
        "datasets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("column_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("schema_definition", postgresql.JSONB(), nullable=False, server_default="'{}'"),
        sa.Column("status", sa.Enum("pending", "processing", "ready", "failed", name="datasetstatus"), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("statistics", postgresql.JSONB(), nullable=False, server_default="'{}'"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_datasets_organization_id", "datasets", ["organization_id"])
    op.create_index("ix_datasets_org_status", "datasets", ["organization_id", "status"])

    # --- DATASET ROWS ---
    op.create_table(
        "dataset_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_dataset_rows_dataset_id", "dataset_rows", ["dataset_id"])
    op.create_index("ix_dataset_rows_dataset_row", "dataset_rows", ["dataset_id", "row_index"])

    # --- DASHBOARDS ---
    op.create_table(
        "dashboards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("widgets", postgresql.JSONB(), nullable=False, server_default="'[]'"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_dashboards_organization_id", "dashboards", ["organization_id"])
    op.create_index("ix_dashboards_org_dataset", "dashboards", ["organization_id", "dataset_id"])

    # --- INSIGHTS ---
    op.create_table(
        "insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("response", postgresql.JSONB(), nullable=False, server_default="'{}'"),
        sa.Column("model_used", sa.String(100), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_insights_organization_id", "insights", ["organization_id"])
    op.create_index("ix_insights_org_user", "insights", ["organization_id", "user_id"])
    op.create_index("ix_insights_created_at", "insights", ["organization_id", "created_at"])

    # --- ANALYTICS EVENTS ---
    op.create_table(
        "analytics_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("event_data", postgresql.JSONB(), nullable=False, server_default="'{}'"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_analytics_events_organization_id", "analytics_events", ["organization_id"])
    op.create_index("ix_analytics_org_event", "analytics_events", ["organization_id", "event_type"])
    op.create_index("ix_analytics_org_created", "analytics_events", ["organization_id", "created_at"])
    op.create_index("ix_analytics_user", "analytics_events", ["user_id", "created_at"])

    # --- INVITES ---
    op.create_table(
        "invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "analyst", "viewer", name="memberrole"), nullable=False, server_default="analyst"),
        sa.Column("token", sa.String(512), nullable=False),
        sa.Column("status", sa.Enum("pending", "accepted", "expired", "revoked", name="invitestatus"), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_invites_organization_id", "invites", ["organization_id"])
    op.create_index("ix_invites_token", "invites", ["token"])
    op.create_index("ix_invites_org_email", "invites", ["organization_id", "email"])


def downgrade() -> None:
    op.drop_table("invites")
    op.drop_table("analytics_events")
    op.drop_table("insights")
    op.drop_table("dashboards")
    op.drop_table("dataset_rows")
    op.drop_table("datasets")
    op.drop_table("memberships")
    op.drop_table("organizations")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS invitestatus")
    op.execute("DROP TYPE IF EXISTS datasetstatus")
    op.execute("DROP TYPE IF EXISTS memberrole")
    op.execute("DROP TYPE IF EXISTS plantype")
