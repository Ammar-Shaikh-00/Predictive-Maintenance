"""Central configuration for API, polling, and window settings."""

import os

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_TSDB_RESULTS = os.path.join(
    _PROJECT_ROOT,
    "timeSeriesDB",
    "time-series-database",
    "process_segmentation_outputs",
    "results",
)

# Real API settings
API_URL = os.getenv("API_URL", "http://100.119.197.81:8002/dashboard/extruder-latest-values")
API_TIMEOUT_SECONDS = int(os.getenv("API_TIMEOUT_SECONDS", "5"))
# no API key required for this endpoint
# polls live extruder data every POLL_INTERVAL_SECONDS
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "10"))  # how often we poll the API

# Rolling window settings — aligned with LIVE_WINDOW_MINUTES (5-min training scale)
WINDOW_DURATION_SECONDS = int(os.getenv("WINDOW_DURATION_SECONDS", "300"))  # 5 minutes of data in buffer
BUFFER_MAX_POINTS = max(
    1,
    (WINDOW_DURATION_SECONDS + POLL_INTERVAL_SECONDS - 1) // POLL_INTERVAL_SECONDS,
)
BUFFER_MIN_POINTS = int(os.getenv("BUFFER_MIN_POINTS", str(BUFFER_MAX_POINTS)))

# Sensor field mapping (based on machine sensor mapping table)
FIELD_TIMESTAMP = "TrendDate"
FIELD_SCREW_SPEED = "Val_1"
FIELD_PRESSURE = "Val_6"
FIELD_LOAD = "Val_5"
FIELD_TEMPERATURE_ZONES = [ 
    "Val_7",
    "Val_8",
    "Val_9",
    "Val_10",
    "Val_11",
    "Val_27",
    "Val_28",
    "Val_29",
    "Val_30",
    "Val_31",
    "Val_32",
]
# temperature = average of all 11 zone sensors

# State confirmation
CONFIRMATION_WINDOWS = int(os.getenv("CONFIRMATION_WINDOWS", "3"))  # consecutive windows needed to confirm state
MIN_STATE_WINDOWS = int(os.getenv("MIN_STATE_WINDOWS", "5"))  # minimum windows before allowing state transition
# prevents rapid flickering between similar states

# states that trigger baseline + run evaluation (include all so ML fields are persisted)
_evaluable_states_raw = os.getenv(
    "EVALUABLE_STATES",
    "PRODUCTION,LOW_PRODUCTION,OFF,HEATING,COOLING,READY",
)
EVALUABLE_STATES = [s.strip() for s in _evaluable_states_raw.split(",") if s.strip()]

# Backend persistence (live output goes here — not local SQLite)
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://192.168.100.24:8002").rstrip("/")
BACKEND_TIMEOUT_SECONDS = float(os.getenv("BACKEND_TIMEOUT_SECONDS", "10"))
# Optional overrides; if empty, resolved from GET /machines + RUNNING production-run
MACHINE_ID = os.getenv("MACHINE_ID", "6f37c433-44e9-4a66-b019-cc342a95cc54").strip() or None
LINE_ID = int(os.getenv("LINE_ID")) if os.getenv("LINE_ID", "").strip() else None  # resolved from run (29)
MACHINE_NAME = os.getenv("MACHINE_NAME", "Extruder").strip() or None
CONTEXT_REFRESH_SECONDS = int(os.getenv("CONTEXT_REFRESH_SECONDS", "60"))

# Local SQLite only for offline/legacy ML scripts (not used for live pipeline writes)
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING", "sqlite:///live_monitor.db")

# single source of truth for regime thresholds across all modules
REGIME_LOW_MAX = 280.0
REGIME_MID_MIN = 280.0
REGIME_MID_MAX = 320.0
REGIME_HIGH_MIN = 320.0

# ML data paths (relative to project root)
WINDOWED_FEATURES_CSV = os.path.join(_TSDB_RESULTS, "windowed_features.csv")
STABLE_RUNS_CSV = os.path.join(_TSDB_RESULTS, "stable_runs.csv")
ML_OUTPUT_DIR = os.path.join(_PROJECT_ROOT, "live_monitor", "ml_data")

# 30-min windows for ML Layer 2 (anomaly detection, clustering, LSTM)
ML_WINDOW_MINUTES = int(os.getenv("ML_WINDOW_MINUTES", "30"))
ML_WINDOW_MIN_ROWS = int(os.getenv("ML_WINDOW_MIN_ROWS", "10"))
ML_30MIN_MATRIX_CSV = os.path.join(ML_OUTPUT_DIR, "ml_feature_matrix_30min.csv")

# 5-min windows for live-scale classifier training (storage.build_live_windows)
LIVE_WINDOW_MINUTES = int(os.getenv("LIVE_WINDOW_MINUTES", "5"))
LIVE_WINDOW_MIN_ROWS = int(os.getenv("LIVE_WINDOW_MIN_ROWS", "3"))
LIVE_WINDOWS_CSV = os.path.join(ML_OUTPUT_DIR, "ml_live_windows.csv")
LIVE_LABELED_CSV = os.path.join(ML_OUTPUT_DIR, "ml_live_labeled.csv")
# 5-min windows match live pipeline scale (BUFFER_MAX_POINTS polls at POLL_INTERVAL_SECONDS)

# historical stable run thresholds (align with offline segmentation gates)
STABLE_SPEED_MEAN_MIN = float(os.getenv("STABLE_SPEED_MEAN_MIN", "20.0"))
STABLE_SPEED_DELTA_MAX = float(os.getenv("STABLE_SPEED_DELTA_MAX", "8.0"))

# Isolation Forest — train_anomaly_production, train_anomaly_off (override via env)
_anomaly_if_contamination_raw = os.getenv("ANOMALY_IF_CONTAMINATION", "auto").strip().lower()
ANOMALY_IF_CONTAMINATION = "auto" if _anomaly_if_contamination_raw == "auto" else float(_anomaly_if_contamination_raw)
ANOMALY_IF_RANDOM_STATE = int(os.getenv("ANOMALY_IF_RANDOM_STATE", "42"))
ANOMALY_IF_N_ESTIMATORS = int(os.getenv("ANOMALY_IF_N_ESTIMATORS", "100"))

# Minimum labeled-window counts for anomaly model registry (ml.model_registry)
ANOMALY_MIN_SAMPLES_PRODUCTION = int(os.getenv("ANOMALY_MIN_SAMPLES_PRODUCTION", "100"))
ANOMALY_MIN_SAMPLES_OFF = int(os.getenv("ANOMALY_MIN_SAMPLES_OFF", "100"))
ANOMALY_MIN_SAMPLES_HEATING = int(os.getenv("ANOMALY_MIN_SAMPLES_HEATING", "20"))
ANOMALY_MIN_SAMPLES_LOW_PRODUCTION = int(os.getenv("ANOMALY_MIN_SAMPLES_LOW_PRODUCTION", "50"))
ANOMALY_MIN_SAMPLES_COOLING = int(os.getenv("ANOMALY_MIN_SAMPLES_COOLING", "50"))
ANOMALY_MIN_SAMPLES_READY = int(os.getenv("ANOMALY_MIN_SAMPLES_READY", "50"))

# background ML retrain scheduler (ml.retrain_scheduler)
RETRAIN_INTERVAL_HOURS = int(os.getenv("RETRAIN_INTERVAL_HOURS", "24"))  # retrain every 24 hours if new data exists
RETRAIN_MIN_NEW_ROWS = int(os.getenv("RETRAIN_MIN_NEW_ROWS", "500"))  # minimum new live_api rows before retraining

# drift detection (ml.drift_detector)
DRIFT_WINDOW_COUNT = int(os.getenv("DRIFT_WINDOW_COUNT", "10"))  # number of recent windows to compare against baseline mean
DRIFT_ALERT_ZSCORE = float(os.getenv("DRIFT_ALERT_ZSCORE", "2.5"))  # z-score threshold for drift alert, learned from data spread

