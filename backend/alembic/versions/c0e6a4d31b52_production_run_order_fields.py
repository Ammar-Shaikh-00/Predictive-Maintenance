"""add production run order fields for Module 8

Revision ID: c0e6a4d31b52
Revises: b9d5f3c20a41
Create Date: 2026-07-27 18:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c0e6a4d31b52"
down_revision: Union[str, None] = "b9d5f3c20a41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("production_run", sa.Column("tool_name", sa.String(), nullable=True))
    op.add_column("production_run", sa.Column("target_qty", sa.Float(), nullable=True))
    op.add_column("production_run", sa.Column("actual_qty", sa.Float(), nullable=True))
    op.add_column("production_run", sa.Column("progress_pct", sa.Float(), nullable=True))
    op.add_column(
        "production_run",
        sa.Column("eta_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("production_run", "eta_at")
    op.drop_column("production_run", "progress_pct")
    op.drop_column("production_run", "actual_qty")
    op.drop_column("production_run", "target_qty")
    op.drop_column("production_run", "tool_name")
