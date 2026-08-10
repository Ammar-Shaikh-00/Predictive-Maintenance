"""add ticket estimated_downtime_cost for Module 17

Revision ID: d1f7b5e42c63
Revises: c0e6a4d31b52
Create Date: 2026-07-28 11:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1f7b5e42c63"
down_revision: Union[str, None] = "c0e6a4d31b52"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column("estimated_downtime_cost", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ticket", "estimated_downtime_cost")
