"""operations hardening tables

Revision ID: 7c3f4f8e9a21
Revises: 2f0d4210b815
Create Date: 2026-07-27 15:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "7c3f4f8e9a21"
down_revision: Union[str, None] = "2f0d4210b815"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "data_sources",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("site_id", sa.String(length=64), nullable=True),
        sa.Column("line_id", sa.String(length=64), nullable=True),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("source_key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("connection_type", sa.String(length=32), nullable=True),
        sa.Column("expected_interval_seconds", sa.Integer(), nullable=True),
        sa.Column("last_seen_at", sa.String(length=64), nullable=True),
        sa.Column("completeness_score", sa.Float(), nullable=False),
        sa.Column("freshness_score", sa.Float(), nullable=False),
        sa.Column("reliability_score", sa.Float(), nullable=False),
        sa.Column("validated", sa.Boolean(), nullable=False),
        sa.Column("fields", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "source_key", name="uq_data_sources_company_source_key"),
    )
    op.create_index(op.f("ix_data_sources_category"), "data_sources", ["category"], unique=False)
    op.create_index(op.f("ix_data_sources_company_id"), "data_sources", ["company_id"], unique=False)
    op.create_index(op.f("ix_data_sources_line_id"), "data_sources", ["line_id"], unique=False)
    op.create_index(op.f("ix_data_sources_machine_id"), "data_sources", ["machine_id"], unique=False)
    op.create_index(op.f("ix_data_sources_site_id"), "data_sources", ["site_id"], unique=False)
    op.create_index(op.f("ix_data_sources_source_key"), "data_sources", ["source_key"], unique=False)
    op.create_index(op.f("ix_data_sources_status"), "data_sources", ["status"], unique=False)

    op.create_table(
        "machine_integrations",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("machine_id", sa.String(length=128), nullable=False),
        sa.Column("machine_name", sa.String(length=160), nullable=True),
        sa.Column("network_connected", sa.Boolean(), nullable=False),
        sa.Column("process_data_connected", sa.Boolean(), nullable=False),
        sa.Column("state_data_connected", sa.Boolean(), nullable=False),
        sa.Column("quality_linked", sa.Boolean(), nullable=False),
        sa.Column("maintenance_linked", sa.Boolean(), nullable=False),
        sa.Column("material_linked", sa.Boolean(), nullable=False),
        sa.Column("energy_linked", sa.Boolean(), nullable=False),
        sa.Column("integration_score", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "machine_id", name="uq_machine_integrations_company_machine"),
    )
    op.create_index(op.f("ix_machine_integrations_company_id"), "machine_integrations", ["company_id"], unique=False)
    op.create_index(op.f("ix_machine_integrations_machine_id"), "machine_integrations", ["machine_id"], unique=False)

    op.create_table(
        "feature_capabilities",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("feature_key", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("required_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("recommended_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("validation_required", sa.Boolean(), nullable=False),
        sa.Column("minimum_history_days", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "feature_key", name="uq_feature_capabilities_company_feature"),
    )
    op.create_index(op.f("ix_feature_capabilities_company_id"), "feature_capabilities", ["company_id"], unique=False)
    op.create_index(op.f("ix_feature_capabilities_feature_key"), "feature_capabilities", ["feature_key"], unique=False)

    op.create_table(
        "feature_status",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("feature_key", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("history_days", sa.Integer(), nullable=False),
        sa.Column("required_days", sa.Integer(), nullable=False),
        sa.Column("missing_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("notes", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("model_id", sa.String(length=128), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "feature_key", name="uq_feature_status_company_feature"),
    )
    op.create_index(op.f("ix_feature_status_company_id"), "feature_status", ["company_id"], unique=False)
    op.create_index(op.f("ix_feature_status_feature_key"), "feature_status", ["feature_key"], unique=False)
    op.create_index(op.f("ix_feature_status_status"), "feature_status", ["status"], unique=False)

    op.create_table(
        "integration_progress",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("digitalization_progress", sa.Float(), nullable=False),
        sa.Column("prediction_readiness", sa.Float(), nullable=False),
        sa.Column("data_quality_score", sa.Float(), nullable=False),
        sa.Column("connected_machines", sa.Integer(), nullable=False),
        sa.Column("total_machines", sa.Integer(), nullable=False),
        sa.Column("connected_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("missing_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", name="uq_integration_progress_company"),
    )
    op.create_index(op.f("ix_integration_progress_company_id"), "integration_progress", ["company_id"], unique=False)

    op.create_table(
        "progress_events",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("feature_key", sa.String(length=120), nullable=True),
        sa.Column("actor", sa.String(length=120), nullable=True),
        sa.Column("old_progress", sa.Float(), nullable=True),
        sa.Column("new_progress", sa.Float(), nullable=True),
        sa.Column("old_readiness", sa.Float(), nullable=True),
        sa.Column("new_readiness", sa.Float(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_progress_events_company_id"), "progress_events", ["company_id"], unique=False)
    op.create_index(op.f("ix_progress_events_event_type"), "progress_events", ["event_type"], unique=False)

    op.create_table(
        "data_source_health",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("source_key", sa.String(length=120), nullable=False),
        sa.Column("completeness", sa.Float(), nullable=False),
        sa.Column("freshness", sa.Float(), nullable=False),
        sa.Column("consistency", sa.Float(), nullable=False),
        sa.Column("validity", sa.Float(), nullable=False),
        sa.Column("availability", sa.Float(), nullable=False),
        sa.Column("quality_score", sa.Float(), nullable=False),
        sa.Column("issues", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_source_health_company_id"), "data_source_health", ["company_id"], unique=False)
    op.create_index(op.f("ix_data_source_health_source_key"), "data_source_health", ["source_key"], unique=False)

    op.create_table(
        "signal_normalization_map",
        sa.Column("machine_type", sa.String(length=64), nullable=False),
        sa.Column("raw_key", sa.String(length=120), nullable=False),
        sa.Column("canonical_key", sa.String(length=160), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_type", "raw_key", name="uq_signal_map_machine_raw"),
    )
    op.create_index(op.f("ix_signal_normalization_map_canonical_key"), "signal_normalization_map", ["canonical_key"], unique=False)
    op.create_index(op.f("ix_signal_normalization_map_machine_type"), "signal_normalization_map", ["machine_type"], unique=False)
    op.create_index(op.f("ix_signal_normalization_map_raw_key"), "signal_normalization_map", ["raw_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_signal_normalization_map_raw_key"), table_name="signal_normalization_map")
    op.drop_index(op.f("ix_signal_normalization_map_machine_type"), table_name="signal_normalization_map")
    op.drop_index(op.f("ix_signal_normalization_map_canonical_key"), table_name="signal_normalization_map")
    op.drop_table("signal_normalization_map")

    op.drop_index(op.f("ix_data_source_health_source_key"), table_name="data_source_health")
    op.drop_index(op.f("ix_data_source_health_company_id"), table_name="data_source_health")
    op.drop_table("data_source_health")

    op.drop_index(op.f("ix_progress_events_event_type"), table_name="progress_events")
    op.drop_index(op.f("ix_progress_events_company_id"), table_name="progress_events")
    op.drop_table("progress_events")

    op.drop_index(op.f("ix_integration_progress_company_id"), table_name="integration_progress")
    op.drop_table("integration_progress")

    op.drop_index(op.f("ix_feature_status_status"), table_name="feature_status")
    op.drop_index(op.f("ix_feature_status_feature_key"), table_name="feature_status")
    op.drop_index(op.f("ix_feature_status_company_id"), table_name="feature_status")
    op.drop_table("feature_status")

    op.drop_index(op.f("ix_feature_capabilities_feature_key"), table_name="feature_capabilities")
    op.drop_index(op.f("ix_feature_capabilities_company_id"), table_name="feature_capabilities")
    op.drop_table("feature_capabilities")

    op.drop_index(op.f("ix_machine_integrations_machine_id"), table_name="machine_integrations")
    op.drop_index(op.f("ix_machine_integrations_company_id"), table_name="machine_integrations")
    op.drop_table("machine_integrations")

    op.drop_index(op.f("ix_data_sources_status"), table_name="data_sources")
    op.drop_index(op.f("ix_data_sources_source_key"), table_name="data_sources")
    op.drop_index(op.f("ix_data_sources_site_id"), table_name="data_sources")
    op.drop_index(op.f("ix_data_sources_machine_id"), table_name="data_sources")
    op.drop_index(op.f("ix_data_sources_line_id"), table_name="data_sources")
    op.drop_index(op.f("ix_data_sources_company_id"), table_name="data_sources")
    op.drop_index(op.f("ix_data_sources_category"), table_name="data_sources")
    op.drop_table("data_sources")

