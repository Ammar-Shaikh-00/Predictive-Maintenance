from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.base import ORMBase


class DataSourceUpsert(BaseModel):
    company_id: str = "default"
    site_id: Optional[str] = None
    line_id: Optional[str] = None
    machine_id: Optional[str] = None

    source_key: str
    name: str
    category: str
    status: str = "connected"
    connection_type: Optional[str] = None

    expected_interval_seconds: Optional[int] = None
    last_seen_at: Optional[str] = None

    completeness_score: float = 0.0
    freshness_score: float = 0.0
    reliability_score: float = 0.0
    validated: bool = False

    fields: List[str] = Field(default_factory=list)
    settings: Dict[str, Any] = Field(default_factory=dict)


class DataSourceRead(ORMBase, DataSourceUpsert):
    pass


class MachineIntegrationUpsert(BaseModel):
    company_id: str = "default"
    machine_id: str
    machine_name: Optional[str] = None

    network_connected: bool = False
    process_data_connected: bool = False
    state_data_connected: bool = False
    quality_linked: bool = False
    maintenance_linked: bool = False
    material_linked: bool = False
    energy_linked: bool = False
    integration_score: int = 0


class MachineIntegrationRead(ORMBase, MachineIntegrationUpsert):
    pass


class FeatureCapabilityUpsert(BaseModel):
    company_id: str = "default"
    feature_key: str
    name: str
    description: Optional[str] = None
    required_sources: List[str] = Field(default_factory=list)
    recommended_sources: List[str] = Field(default_factory=list)
    validation_required: bool = True
    minimum_history_days: int = 30
    enabled: bool = True


class FeatureCapabilityRead(ORMBase, FeatureCapabilityUpsert):
    pass


class FeatureStatusRead(ORMBase):
    company_id: str
    feature_key: str
    status: str
    history_days: int
    required_days: int
    missing_sources: List[str] = Field(default_factory=list)
    notes: Dict[str, Any] = Field(default_factory=dict)
    model_id: Optional[str] = None


class DataQualityInput(BaseModel):
    company_id: str = "default"
    source_key: str
    missing_values_ratio: float = 0.0
    stale_ratio: float = 0.0
    duplicate_ratio: float = 0.0
    invalid_ratio: float = 0.0
    availability_ratio: float = 1.0


class DataQualitySnapshotRead(ORMBase):
    company_id: str
    source_key: str
    completeness: float
    freshness: float
    consistency: float
    validity: float
    availability: float
    quality_score: float
    issues: List[str] = Field(default_factory=list)


class ConnectorConnectionConfig(BaseModel):
    """Connection details for real connectors (stored on data_sources.settings.connection)."""

    # CSV / Excel / Manual
    csv_text: Optional[str] = None
    file_path: Optional[str] = None
    upload_path: Optional[str] = None
    delimiter: Optional[str] = None

    # SQL / MSSQL
    use_saved_mssql: bool = True
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None
    table: Optional[str] = None
    query: Optional[str] = None
    sql: Optional[str] = None

    # API
    url: Optional[str] = None
    method: str = "GET"
    headers: Dict[str, Any] = Field(default_factory=dict)
    params: Dict[str, Any] = Field(default_factory=dict)
    body: Optional[Any] = None
    json_path: Optional[str] = None
    timeout_seconds: float = 20.0


class SetupWizardDraft(BaseModel):
    company_id: str = "default"
    source_key: str
    source_type: str
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    import_history_days: int = 30
    preview_rows: int = 200
    connection: Dict[str, Any] = Field(default_factory=dict)


class SetupWizardResult(BaseModel):
    source_key: str
    activated: bool
    steps_completed: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    message: Optional[str] = None


class SetupWizardPreviewRequest(BaseModel):
    company_id: str = "default"
    source_key: str
    source_type: str = "csv"
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    preview_rows: int = 5
    connection: Dict[str, Any] = Field(default_factory=dict)


class SetupWizardPreviewResponse(BaseModel):
    source_key: str
    source_type: str
    columns: List[str] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    value_source: str = "LIVE"
    error: Optional[str] = None


class SetupWizardImportRequest(BaseModel):
    company_id: str = "default"
    source_key: str
    import_history_days: int = 30
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    connection: Dict[str, Any] = Field(default_factory=dict)
    source_type: Optional[str] = None


class SetupWizardImportResponse(BaseModel):
    source_key: str
    imported_rows: int
    import_history_days: int
    status: str
    value_source: str = "LIVE"
    import_batch_id: Optional[str] = None
    error: Optional[str] = None
    domain_table: Optional[str] = None
    domain_rows: int = 0
    quality_records_linked: int = 0
    domain_promote: Dict[str, Any] = Field(default_factory=dict)


class SetupWizardAssessQualityRequest(BaseModel):
    company_id: str = "default"
    source_key: str
    source_type: str = "csv"
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    connection: Dict[str, Any] = Field(default_factory=dict)
    sample_rows: int = 200


class NormalizeSignalRequest(BaseModel):
    machine_type: str = "extruder"
    raw_key: str
    unit: Optional[str] = None
    canonical_key: Optional[str] = None


class NormalizeSignalResponse(BaseModel):
    machine_type: str
    raw_key: str
    canonical_key: str
    source: str


class TimelineRecordIn(BaseModel):
    company_id: str = "default"
    site_id: Optional[str] = None
    line_id: Optional[str] = None
    machine_id: Optional[str] = None
    production_run_id: Optional[str] = None
    material_id: Optional[str] = None
    material_batch_id: Optional[str] = None
    source_id: Optional[str] = None
    timestamp: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class ProgressEventRead(ORMBase):
    company_id: str
    event_type: str
    source: Optional[str] = None
    feature_key: Optional[str] = None
    actor: Optional[str] = None
    old_progress: Optional[float] = None
    new_progress: Optional[float] = None
    old_readiness: Optional[float] = None
    new_readiness: Optional[float] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class HardeningOverview(BaseModel):
    company_id: str
    digitalization_progress: float
    prediction_readiness: float
    data_quality_score: float
    connected_machines: int
    total_machines: int
    connected_sources: List[str]
    missing_sources: List[str]
    feature_status: List[FeatureStatusRead]
    recent_progress_events: List[ProgressEventRead]

