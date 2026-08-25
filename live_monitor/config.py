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

# Postgres history for ML training / retrain (GET /machine-raw-data/)
# Prefer HISTORY_DATE_FROM; otherwise look back HISTORY_LOOKBACK_DAYS from now.
HISTORY_DATE_FROM = os.getenv("HISTORY_DATE_FROM", "").strip() or None
HISTORY_LOOKBACK_DAYS = int(os.getenv("HISTORY_LOOKBACK_DAYS", "365"))
RAW_PAGE_SIZE = int(os.getenv("RAW_PAGE_SIZE", "1000"))  # backend max page is 10000
HISTORY_TIMEOUT_SECONDS = float(os.getenv("HISTORY_TIMEOUT_SECONDS", "60"))

# single source of truth for regime thresholds across all modules
REGIME_LOW_MAX = 280.0
REGIME_MID_MIN = 280.0
REGIME_MID_MAX = 320.0
REGIME_HIGH_MIN = 320.0

# Offline segmentation CSVs (used by storage.populate_baseline)
STABLE_RUNS_CSV = os.path.join(_TSDB_RESULTS, "stable_runs.csv")
ML_OUTPUT_DIR = os.path.join(_PROJECT_ROOT, "live_monitor", "ml_data")

# 5-min windows for live-scale classifier training (storage.build_live_windows)
LIVE_WINDOW_MINUTES = int(os.getenv("LIVE_WINDOW_MINUTES", "5"))
LIVE_WINDOW_MIN_ROWS = int(os.getenv("LIVE_WINDOW_MIN_ROWS", "3"))
LIVE_WINDOWS_CSV = os.path.join(ML_OUTPUT_DIR, "ml_live_windows.csv")
LIVE_LABELED_CSV = os.path.join(ML_OUTPUT_DIR, "ml_live_labeled.csv")

# Isolation Forest — train_anomaly_* (override via env)
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

# Offline retrain on PC only (run_retrain.py). live_monitor main.py never starts it.
RETRAIN_INTERVAL_HOURS = int(os.getenv("RETRAIN_INTERVAL_HOURS", "24"))
RETRAIN_MIN_NEW_ROWS = int(os.getenv("RETRAIN_MIN_NEW_ROWS", "500"))

# drift detection (ml.drift_detector)
DRIFT_WINDOW_COUNT = int(os.getenv("DRIFT_WINDOW_COUNT", "10"))
DRIFT_ALERT_ZSCORE = float(os.getenv("DRIFT_ALERT_ZSCORE", "2.5"))

# Generic z fallback only when baseline warning/critical bands are missing
FEATURE_Z_WARNING = float(os.getenv("FEATURE_Z_WARNING", "1.5"))
FEATURE_Z_CRITICAL = float(os.getenv("FEATURE_Z_CRITICAL", "2.5"))

# Optional plant policy file for baseline band refresh (evaluator stays free of feature hardcode).
BASELINE_BAND_POLICY_PATH = os.getenv(
    "BASELINE_BAND_POLICY_PATH",
    os.path.join(ML_OUTPUT_DIR, "baseline_band_policy.json"),
)

