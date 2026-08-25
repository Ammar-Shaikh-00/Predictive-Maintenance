"""machine prediction readiness (AI/ML owned)

Revision ID: g4c0e8b75f96
Revises: a1b2c3d4e5f6
Create Date: 2026-08-11
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "g4c0e8b75f96"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "machine_prediction_readiness",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("machine_id", sa.String(length=128), nullable=False),
        sa.Column("readiness_pct", sa.Float(), nullable=False),
        sa.Column("model_id", sa.String(length=128), nullable=True),
        sa.Column("model_version", sa.String(length=64), nullable=True),
        sa.Column("value_source", sa.String(length=32), nullable=False),
        sa.Column("reported_at", sa.String(length=64), nullable=True),
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.UniqueConstraint(
            "company_id",
            "machine_id",
            name="uq_machine_prediction_readiness_company_machine",
        ),
    )
    op.create_index(
        "ix_machine_prediction_readiness_company_id",
        "machine_prediction_readiness",
        ["company_id"],
    )
    op.create_index(
        "ix_machine_prediction_readiness_machine_id",
        "machine_prediction_readiness",
        ["machine_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_machine_prediction_readiness_machine_id",
        table_name="machine_prediction_readiness",
    )
    op.drop_index(
        "ix_machine_prediction_readiness_company_id",
        table_name="machine_prediction_readiness",
    )
    op.drop_table("machine_prediction_readiness")
