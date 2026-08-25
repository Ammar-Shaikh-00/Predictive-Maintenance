"""Add ML anomaly fields to live_run_evaluation

Revision ID: a1b2c3d4e5f6
Revises: f3b9d7a64e85
Create Date: 2026-08-07 16:55:00.000000

- Rename anomaly_score → ml_anomaly_score (when legacy column exists)
- Add ml_is_anomaly (boolean, nullable)
- Add ml_model_status (varchar(64), nullable)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f3b9d7a64e85"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "live_run_evaluation"


def _columns(bind) -> set[str]:
    inspector = inspect(bind)
    if TABLE not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(TABLE)}


def upgrade() -> None:
    bind = op.get_bind()
    cols = _columns(bind)
    if not cols:
        # Table may be managed outside Alembic (create_all); skip safely.
        return

    if "ml_anomaly_score" not in cols and "anomaly_score" in cols:
        op.alter_column(
            TABLE,
            "anomaly_score",
            new_column_name="ml_anomaly_score",
            existing_type=sa.Float(),
            existing_nullable=True,
        )
        cols.discard("anomaly_score")
        cols.add("ml_anomaly_score")
    elif "ml_anomaly_score" not in cols:
        op.add_column(TABLE, sa.Column("ml_anomaly_score", sa.Float(), nullable=True))
        cols.add("ml_anomaly_score")

    if "ml_is_anomaly" not in cols:
        op.add_column(TABLE, sa.Column("ml_is_anomaly", sa.Boolean(), nullable=True))

    if "ml_model_status" not in cols:
        op.add_column(
            TABLE,
            sa.Column("ml_model_status", sa.String(length=64), nullable=True),
        )

    # Helpful filter indexes for ML consumers
    inspector = inspect(bind)
    existing_indexes = {ix["name"] for ix in inspector.get_indexes(TABLE)}
    if "ix_live_run_evaluation_ml_is_anomaly" not in existing_indexes:
        op.create_index(
            "ix_live_run_evaluation_ml_is_anomaly",
            TABLE,
            ["ml_is_anomaly"],
            unique=False,
        )
    if "ix_live_run_evaluation_ml_model_status" not in existing_indexes:
        op.create_index(
            "ix_live_run_evaluation_ml_model_status",
            TABLE,
            ["ml_model_status"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    cols = _columns(bind)
    if not cols:
        return

    inspector = inspect(bind)
    existing_indexes = {ix["name"] for ix in inspector.get_indexes(TABLE)}
    if "ix_live_run_evaluation_ml_model_status" in existing_indexes:
        op.drop_index("ix_live_run_evaluation_ml_model_status", table_name=TABLE)
    if "ix_live_run_evaluation_ml_is_anomaly" in existing_indexes:
        op.drop_index("ix_live_run_evaluation_ml_is_anomaly", table_name=TABLE)

    if "ml_model_status" in cols:
        op.drop_column(TABLE, "ml_model_status")
    if "ml_is_anomaly" in cols:
        op.drop_column(TABLE, "ml_is_anomaly")

    cols = _columns(bind)
    if "ml_anomaly_score" in cols and "anomaly_score" not in cols:
        op.alter_column(
            TABLE,
            "ml_anomaly_score",
            new_column_name="anomaly_score",
            existing_type=sa.Float(),
            existing_nullable=True,
        )
