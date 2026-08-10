"""Module 18 — Maintenance Center operational tables (non-AI/ML).

Remaining useful life is never stored here — only consumed from predictions when present.
"""

from sqlalchemy import Column, DateTime, Float, String, Text

from app.models.base import Base


class MaintenancePlan(Base):
    """Planned / scheduled maintenance work orders."""

    __tablename__ = "maintenance_plans"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    machine_id = Column(String(128), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    component = Column(String(160), nullable=True)
    planned_at = Column(DateTime(timezone=True), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="planned", index=True)
    # planned | in_progress | done | cancelled
    technician = Column(String(160), nullable=True)
    notes = Column(Text, nullable=True)
    value_source = Column(String(32), nullable=False, default="MANUAL")


class WearPart(Base):
    """Wear / spare parts register for maintenance planning."""

    __tablename__ = "wear_parts"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    machine_id = Column(String(128), nullable=True, index=True)
    name = Column(String(160), nullable=False)
    part_number = Column(String(128), nullable=True, index=True)
    component = Column(String(160), nullable=True)
    installed_at = Column(DateTime(timezone=True), nullable=True)
    next_replace_at = Column(DateTime(timezone=True), nullable=True, index=True)
    quantity_on_hand = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    value_source = Column(String(32), nullable=False, default="MANUAL")
