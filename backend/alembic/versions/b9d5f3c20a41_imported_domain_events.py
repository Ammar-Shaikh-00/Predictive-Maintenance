"""imported domain event sinks for connector history

Revision ID: b9d5f3c20a41
Revises: a8c4e2b19f30
Create Date: 2026-07-27 17:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b9d5f3c20a41"
down_revision: Union[str, None] = "a8c4e2b19f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base_cols():
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "imported_quality_events",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
        sa.Column("source_import_row_id", sa.Uuid(), nullable=True),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("event_at", sa.String(length=64), nullable=True),
        sa.Column("external_run_key", sa.String(length=128), nullable=True),
        sa.Column("production_run_id", sa.Integer(), nullable=True),
        sa.Column("material_batch", sa.String(length=128), nullable=True),
        sa.Column("quality_value", sa.Float(), nullable=True),
        sa.Column("approval_status", sa.String(length=64), nullable=True),
        sa.Column("scrap", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("promoted_to_quality_record", sa.String(length=16), nullable=False),
        *_base_cols(),
        sa.ForeignKeyConstraint(["production_run_id"], ["production_run.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_imported_quality_events_company_id", "imported_quality_events", ["company_id"])
    op.create_index("ix_imported_quality_events_import_batch_id", "imported_quality_events", ["import_batch_id"])
    op.create_index("ix_imported_quality_events_machine_id", "imported_quality_events", ["machine_id"])
    op.create_index("ix_imported_quality_events_event_at", "imported_quality_events", ["event_at"])
    op.create_index("ix_imported_quality_events_external_run_key", "imported_quality_events", ["external_run_key"])
    op.create_index("ix_imported_quality_events_production_run_id", "imported_quality_events", ["production_run_id"])

    op.create_table(
        "imported_maintenance_events",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("event_at", sa.String(length=64), nullable=True),
        sa.Column("work_order", sa.String(length=128), nullable=True),
        sa.Column("component", sa.String(length=160), nullable=True),
        sa.Column("action", sa.String(length=160), nullable=True),
        sa.Column("technician", sa.String(length=160), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        *_base_cols(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_imported_maintenance_events_company_id", "imported_maintenance_events", ["company_id"])
    op.create_index("ix_imported_maintenance_events_import_batch_id", "imported_maintenance_events", ["import_batch_id"])
    op.create_index("ix_imported_maintenance_events_machine_id", "imported_maintenance_events", ["machine_id"])
    op.create_index("ix_imported_maintenance_events_work_order", "imported_maintenance_events", ["work_order"])

    op.create_table(
        "imported_material_batches",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
        sa.Column("material_id", sa.String(length=128), nullable=True),
        sa.Column("material_batch", sa.String(length=128), nullable=True),
        sa.Column("event_at", sa.String(length=64), nullable=True),
        sa.Column("supplier", sa.String(length=160), nullable=True),
        sa.Column("lot_quality", sa.String(length=64), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        *_base_cols(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "material_batch",
            "import_batch_id",
            name="uq_imported_material_batch_company_batch_import",
        ),
    )
    op.create_index("ix_imported_material_batches_company_id", "imported_material_batches", ["company_id"])
    op.create_index("ix_imported_material_batches_material_batch", "imported_material_batches", ["material_batch"])

    op.create_table(
        "imported_energy_readings",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("event_at", sa.String(length=64), nullable=True),
        sa.Column("kwh", sa.Float(), nullable=True),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        *_base_cols(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_imported_energy_readings_company_id", "imported_energy_readings", ["company_id"])
    op.create_index("ix_imported_energy_readings_machine_id", "imported_energy_readings", ["machine_id"])
    op.create_index("ix_imported_energy_readings_event_at", "imported_energy_readings", ["event_at"])

    op.create_table(
        "imported_operator_events",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("event_at", sa.String(length=64), nullable=True),
        sa.Column("value", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        *_base_cols(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_imported_operator_events_company_id", "imported_operator_events", ["company_id"])
    op.create_index("ix_imported_operator_events_machine_id", "imported_operator_events", ["machine_id"])


def downgrade() -> None:
    op.drop_table("imported_operator_events")
    op.drop_table("imported_energy_readings")
    op.drop_table("imported_material_batches")
    op.drop_table("imported_maintenance_events")
    op.drop_table("imported_quality_events")
