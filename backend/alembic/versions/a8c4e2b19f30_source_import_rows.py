"""source import rows for connector staging

Revision ID: a8c4e2b19f30
Revises: 7c3f4f8e9a21
Create Date: 2026-07-27 16:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a8c4e2b19f30"
down_revision: Union[str, None] = "7c3f4f8e9a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_import_rows",
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("source_key", sa.String(length=64), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("value_source", sa.String(length=32), nullable=False),
        sa.Column("row_timestamp", sa.String(length=64), nullable=True),
        sa.Column("machine_id", sa.String(length=128), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_source_import_rows_company_id", "source_import_rows", ["company_id"])
    op.create_index("ix_source_import_rows_source_key", "source_import_rows", ["source_key"])
    op.create_index("ix_source_import_rows_row_timestamp", "source_import_rows", ["row_timestamp"])
    op.create_index("ix_source_import_rows_machine_id", "source_import_rows", ["machine_id"])
    op.create_index("ix_source_import_rows_import_batch_id", "source_import_rows", ["import_batch_id"])


def downgrade() -> None:
    op.drop_index("ix_source_import_rows_import_batch_id", table_name="source_import_rows")
    op.drop_index("ix_source_import_rows_machine_id", table_name="source_import_rows")
    op.drop_index("ix_source_import_rows_row_timestamp", table_name="source_import_rows")
    op.drop_index("ix_source_import_rows_source_key", table_name="source_import_rows")
    op.drop_index("ix_source_import_rows_company_id", table_name="source_import_rows")
    op.drop_table("source_import_rows")
