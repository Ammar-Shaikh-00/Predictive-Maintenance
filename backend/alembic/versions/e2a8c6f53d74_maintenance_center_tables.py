"""add maintenance_plans and wear_parts for Module 18

Revision ID: e2a8c6f53d74
Revises: d1f7b5e42c63
Create Date: 2026-07-28 11:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e2a8c6f53d74"
down_revision: Union[str, None] = "d1f7b5e42c63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "maintenance_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("component", sa.String(length=160), nullable=True),
        sa.Column("planned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("technician", sa.String(length=160), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("value_source", sa.String(length=32), nullable=False),
    )
    op.create_index("ix_maintenance_plans_company_id", "maintenance_plans", ["company_id"])
    op.create_index("ix_maintenance_plans_machine_id", "maintenance_plans", ["machine_id"])
    op.create_index("ix_maintenance_plans_planned_at", "maintenance_plans", ["planned_at"])
    op.create_index("ix_maintenance_plans_status", "maintenance_plans", ["status"])

    op.create_table(
        "wear_parts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("part_number", sa.String(length=128), nullable=True),
        sa.Column("component", sa.String(length=160), nullable=True),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_replace_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("quantity_on_hand", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("value_source", sa.String(length=32), nullable=False),
    )
    op.create_index("ix_wear_parts_company_id", "wear_parts", ["company_id"])
    op.create_index("ix_wear_parts_machine_id", "wear_parts", ["machine_id"])
    op.create_index("ix_wear_parts_part_number", "wear_parts", ["part_number"])
    op.create_index("ix_wear_parts_next_replace_at", "wear_parts", ["next_replace_at"])


def downgrade() -> None:
    op.drop_index("ix_wear_parts_next_replace_at", table_name="wear_parts")
    op.drop_index("ix_wear_parts_part_number", table_name="wear_parts")
    op.drop_index("ix_wear_parts_machine_id", table_name="wear_parts")
    op.drop_index("ix_wear_parts_company_id", table_name="wear_parts")
    op.drop_table("wear_parts")

    op.drop_index("ix_maintenance_plans_status", table_name="maintenance_plans")
    op.drop_index("ix_maintenance_plans_planned_at", table_name="maintenance_plans")
    op.drop_index("ix_maintenance_plans_machine_id", table_name="maintenance_plans")
    op.drop_index("ix_maintenance_plans_company_id", table_name="maintenance_plans")
    op.drop_table("maintenance_plans")
