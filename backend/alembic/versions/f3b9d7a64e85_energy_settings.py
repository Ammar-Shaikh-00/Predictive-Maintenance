"""add energy_settings for Module 19

Revision ID: f3b9d7a64e85
Revises: e2a8c6f53d74
Create Date: 2026-07-28 11:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f3b9d7a64e85"
down_revision: Union[str, None] = "e2a8c6f53d74"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "energy_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("co2_kg_per_kwh", sa.Float(), nullable=True),
        sa.Column("euro_per_kwh", sa.Float(), nullable=True),
        sa.Column("baseline_period_kwh", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.UniqueConstraint("company_id", name="uq_energy_settings_company"),
    )
    op.create_index("ix_energy_settings_company_id", "energy_settings", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_energy_settings_company_id", table_name="energy_settings")
    op.drop_table("energy_settings")
