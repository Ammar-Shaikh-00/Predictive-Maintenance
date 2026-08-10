from app.schemas.alarm import AlarmCreate, AlarmRead, AlarmUpdate
from app.schemas.audit_log import AuditLogCreate, AuditLogRead
from app.schemas.machine import MachineCreate, MachineRead, MachineUpdate
from app.schemas.prediction import PredictionCreate, PredictionRead, PredictionRequest
from app.schemas.report import ReportRequest, ReportResponse
from app.schemas.sensor import SensorCreate, SensorRead, SensorUpdate
from app.schemas.sensor_data import SensorDataIn, SensorDataOut
from app.schemas.settings import SettingsCreate, SettingsRead, SettingsUpdate
from app.schemas.ticket import TicketCreate, TicketRead, TicketUpdate
from app.schemas.user import Token, UserCreate, UserRead
from app.schemas.webhook import WebhookCreate, WebhookRead, WebhookUpdate
from app.schemas.window_features import WindowFeaturesCreate, WindowFeaturesRead
from app.schemas.production_run import ProductionRunCreate, ProductionRunResponse
from app.schemas.quality import QualityCreate, QualityResponse
from app.schemas.ai_analysis import AiAnalysisResponse
from app.schemas.live_process_window import LiveProcessWindowResponse
from app.schemas.machine_sensor_raw import MachineSensorRawResponse

