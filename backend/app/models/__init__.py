from app.models.alarm import Alarm, AlarmSeverity, AlarmStatus
from app.models.attachment import Attachment
from app.models.audit_log import AuditLog
from app.models.comment import Comment
from app.models.job import Job
from app.models.machine import Machine, MachineStatus
from app.models.machine_state import (
    MachineState,
    MachineStateThresholds,
    MachineStateTransition,
    MachineStateAlert,
    MachineProcessEvaluation,
    MachineStateEnum,
)
from app.models.model_registry import ModelRegistry
from app.models.password_reset import PasswordResetToken
from app.models.prediction import Prediction
from app.models.role import Role
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.settings import Settings
from app.models.ticket import Ticket, TicketPriority, TicketStatus
from app.models.user import User
from app.models.webhook import Webhook
from app.models.profile import (
    Profile,
    ProfileStateThresholds,
    ProfileBaselineStats,
    ProfileBaselineSample,
    ProfileScoringBand,
    ProfileMessageTemplate,
    ProfilePressureConfig,
)
from app.models.email_recipient import EmailRecipient
from app.models.material_profile import MaterialProfile
from app.models.default_sensor import DefaultSensor
from app.models.profile_threshold import ProfileThreshold
from app.models.alert_service import AlertService
from app.models.alert_context import AlertContext
from app.models.baseline import Baseline
from app.models.baseline_map import BaselineMap
from app.models.state_senor_priority import StateSensorPriority
from app.models.default_machine_states import DefaultMachineState
from app.models.machine_status import MachineStatus
from app.models.window_features import WindowFeatures
from app.models.ai_run_analysis import AiRunAnalysis
from app.models.live_process_window import LiveProcessWindow
from app.models.live_feature_evaluation import LiveFeatureEvaluation
from app.models.live_run_evaluation import LiveRunEvaluation
from app.models.baseline_registry import BaselineRegistry
from app.models.production_run import ProductionRun
from app.models.quality_record import QualityRecord
from app.models.machine_sensor_raw import MachineSensorRaw
from app.models.operations_hardening import (
    DataSource,
    MachineIntegration,
    FeatureCapability,
    FeatureStatus,
    IntegrationProgress,
    ProgressEvent,
    DataQualitySnapshot,
    SignalNormalizationMap,
    SourceImportRow,
)
from app.models.imported_domain_events import (
    ImportedQualityEvent,
    ImportedMaintenanceEvent,
    ImportedMaterialBatch,
    ImportedEnergyReading,
    ImportedOperatorEvent,
)
from app.models.maintenance_center import MaintenancePlan, WearPart
from app.models.energy_center import EnergySettings
