from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.models.base import Base


class DataSource(Base):
    __tablename__ = "data_sources"
    __table_args__ = (
        UniqueConstraint("company_id", "source_key", name="uq_data_sources_company_source_key"),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    site_id = Column(String(64), nullable=True, index=True)
    line_id = Column(String(64), nullable=True, index=True)
    machine_id = Column(String(128), nullable=True, index=True)

    source_key = Column(String(64), nullable=False, index=True)
    name = Column(String(160), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="connected", index=True)
    connection_type = Column(String(32), nullable=True)

    expected_interval_seconds = Column(Integer, nullable=True)
    last_seen_at = Column(String(64), nullable=True)

    completeness_score = Column(Float, nullable=False, default=0.0)
    freshness_score = Column(Float, nullable=False, default=0.0)
    reliability_score = Column(Float, nullable=False, default=0.0)
    validated = Column(Boolean, nullable=False, default=False)

    fields_json = Column("fields", JSONB, nullable=False, default=list)
    settings_json = Column("settings", JSONB, nullable=False, default=dict)


class MachineIntegration(Base):
    __tablename__ = "machine_integrations"
    __table_args__ = (
        UniqueConstraint("company_id", "machine_id", name="uq_machine_integrations_company_machine"),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    machine_id = Column(String(128), nullable=False, index=True)
    machine_name = Column(String(160), nullable=True)

    network_connected = Column(Boolean, nullable=False, default=False)
    process_data_connected = Column(Boolean, nullable=False, default=False)
    state_data_connected = Column(Boolean, nullable=False, default=False)
    quality_linked = Column(Boolean, nullable=False, default=False)
    maintenance_linked = Column(Boolean, nullable=False, default=False)
    material_linked = Column(Boolean, nullable=False, default=False)
    energy_linked = Column(Boolean, nullable=False, default=False)

    integration_score = Column(Integer, nullable=False, default=0)


class FeatureCapability(Base):
    __tablename__ = "feature_capabilities"
    __table_args__ = (
        UniqueConstraint("company_id", "feature_key", name="uq_feature_capabilities_company_feature"),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    feature_key = Column(String(120), nullable=False, index=True)
    name = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)

    required_sources_json = Column("required_sources", JSONB, nullable=False, default=list)
    recommended_sources_json = Column("recommended_sources", JSONB, nullable=False, default=list)

    validation_required = Column(Boolean, nullable=False, default=True)
    minimum_history_days = Column(Integer, nullable=False, default=30)
    enabled = Column(Boolean, nullable=False, default=True)


class FeatureStatus(Base):
    __tablename__ = "feature_status"
    __table_args__ = (
        UniqueConstraint("company_id", "feature_key", name="uq_feature_status_company_feature"),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    feature_key = Column(String(120), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="LOCKED", index=True)
    history_days = Column(Integer, nullable=False, default=0)
    required_days = Column(Integer, nullable=False, default=0)

    missing_sources_json = Column("missing_sources", JSONB, nullable=False, default=list)
    notes_json = Column("notes", JSONB, nullable=False, default=dict)
    model_id = Column(String(128), nullable=True)


class IntegrationProgress(Base):
    __tablename__ = "integration_progress"
    __table_args__ = (
        UniqueConstraint("company_id", name="uq_integration_progress_company"),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    digitalization_progress = Column(Float, nullable=False, default=0.0)
    prediction_readiness = Column(Float, nullable=False, default=0.0)
    data_quality_score = Column(Float, nullable=False, default=0.0)

    connected_machines = Column(Integer, nullable=False, default=0)
    total_machines = Column(Integer, nullable=False, default=0)

    connected_sources_json = Column("connected_sources", JSONB, nullable=False, default=list)
    missing_sources_json = Column("missing_sources", JSONB, nullable=False, default=list)


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    event_type = Column(String(64), nullable=False, index=True)
    source = Column(String(120), nullable=True)
    feature_key = Column(String(120), nullable=True)
    actor = Column(String(120), nullable=True)

    old_progress = Column(Float, nullable=True)
    new_progress = Column(Float, nullable=True)
    old_readiness = Column(Float, nullable=True)
    new_readiness = Column(Float, nullable=True)

    details_json = Column("details", JSONB, nullable=False, default=dict)


class DataQualitySnapshot(Base):
    __tablename__ = "data_source_health"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    source_key = Column(String(120), nullable=False, index=True)

    completeness = Column(Float, nullable=False, default=0.0)
    freshness = Column(Float, nullable=False, default=0.0)
    consistency = Column(Float, nullable=False, default=0.0)
    validity = Column(Float, nullable=False, default=0.0)
    availability = Column(Float, nullable=False, default=0.0)

    quality_score = Column(Float, nullable=False, default=0.0)
    issues_json = Column("issues", JSONB, nullable=False, default=list)


class SignalNormalizationMap(Base):
    __tablename__ = "signal_normalization_map"
    __table_args__ = (
        UniqueConstraint("machine_type", "raw_key", name="uq_signal_map_machine_raw"),
    )

    machine_type = Column(String(64), nullable=False, index=True, default="extruder")
    raw_key = Column(String(120), nullable=False, index=True)
    canonical_key = Column(String(160), nullable=False, index=True)
    unit = Column(String(32), nullable=True)
    active = Column(Boolean, nullable=False, default=True)


class SourceImportRow(Base):
    """Normalized staging rows from setup-wizard connectors (CSV/SQL/API)."""

    __tablename__ = "source_import_rows"

    company_id = Column(String(64), nullable=False, index=True, default="default")
    source_key = Column(String(64), nullable=False, index=True)
    source_type = Column(String(32), nullable=False, default="csv")
    value_source = Column(String(32), nullable=False, default="LIVE")
    row_timestamp = Column(String(64), nullable=True, index=True)
    machine_id = Column(String(128), nullable=True, index=True)
    payload_json = Column("payload", JSONB, nullable=False, default=dict)
    import_batch_id = Column(String(64), nullable=True, index=True)

