"""Imported domain event tables — sinks for setup-wizard connector history.

These are operational (non-AI/ML) stores for quality, maintenance, material,
and energy rows promoted from staged connector imports.
"""

from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base


class ImportedQualityEvent(Base):
    __tablename__ = "imported_quality_events"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    import_batch_id = Column(String(64), nullable=True, index=True)
    source_import_row_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    machine_id = Column(String(128), nullable=True, index=True)
    event_at = Column(String(64), nullable=True, index=True)
    external_run_key = Column(String(128), nullable=True, index=True)
    production_run_id = Column(
        Integer, ForeignKey("production_run.id"), nullable=True, index=True
    )

    material_batch = Column(String(128), nullable=True)
    quality_value = Column(Float, nullable=True)
    approval_status = Column(String(64), nullable=True)
    scrap = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    payload_json = Column("payload", JSONB, nullable=False, default=dict)
    promoted_to_quality_record = Column(String(16), nullable=False, default="no")


class ImportedMaintenanceEvent(Base):
    __tablename__ = "imported_maintenance_events"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    import_batch_id = Column(String(64), nullable=True, index=True)
    machine_id = Column(String(128), nullable=True, index=True)
    event_at = Column(String(64), nullable=True, index=True)
    work_order = Column(String(128), nullable=True, index=True)
    component = Column(String(160), nullable=True)
    action = Column(String(160), nullable=True)
    technician = Column(String(160), nullable=True)
    payload_json = Column("payload", JSONB, nullable=False, default=dict)


class ImportedMaterialBatch(Base):
    __tablename__ = "imported_material_batches"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "material_batch",
            "import_batch_id",
            name="uq_imported_material_batch_company_batch_import",
        ),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    import_batch_id = Column(String(64), nullable=True, index=True)
    material_id = Column(String(128), nullable=True, index=True)
    material_batch = Column(String(128), nullable=True, index=True)
    event_at = Column(String(64), nullable=True, index=True)
    supplier = Column(String(160), nullable=True)
    lot_quality = Column(String(64), nullable=True)
    payload_json = Column("payload", JSONB, nullable=False, default=dict)


class ImportedEnergyReading(Base):
    __tablename__ = "imported_energy_readings"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    import_batch_id = Column(String(64), nullable=True, index=True)
    machine_id = Column(String(128), nullable=True, index=True)
    event_at = Column(String(64), nullable=True, index=True)
    kwh = Column(Float, nullable=True)
    cost = Column(Float, nullable=True)
    payload_json = Column("payload", JSONB, nullable=False, default=dict)


class ImportedOperatorEvent(Base):
    __tablename__ = "imported_operator_events"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    import_batch_id = Column(String(64), nullable=True, index=True)
    machine_id = Column(String(128), nullable=True, index=True)
    event_at = Column(String(64), nullable=True, index=True)
    value = Column(String(255), nullable=True)
    status = Column(String(64), nullable=True)
    payload_json = Column("payload", JSONB, nullable=False, default=dict)
