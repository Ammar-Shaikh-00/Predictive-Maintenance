"""Score live windows with state-specific Isolation Forest anomaly models."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# step 1: ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from ml.model_registry import MODEL_REGISTRY, load_model  # noqa: E402

# step 2: feature column order for all state anomaly models (matches train_anomaly_*.py).
# must match anomaly model training features exactly
FEATURE_COLUMNS = [
    "mean_Val_1",
    "std_Val_1",
    "mean_Val_5",
    "std_Val_5",
    "mean_Val_6",
    "std_Val_6",
    "temperature_mean",
    "temp_spread_mean",
    "slope_Val_1",
    "slope_Val_6",
    "slope_temperature",
    "temperature_direction",
    "valid_fraction",
]

# map ML artifact names -> keys often present on live FeatureEngine dicts
_LIVE_FEATURE_ALIASES: dict[str, tuple[str, ...]] = {
    "mean_Val_1": ("mean_Val_1", "screw_speed_mean"),
    "std_Val_1": ("std_Val_1", "screw_speed_std"),
    "mean_Val_5": ("mean_Val_5", "load_mean"),
    "std_Val_5": ("std_Val_5", "load_std"),
    "mean_Val_6": ("mean_Val_6", "pressure_mean"),
    "std_Val_6": ("std_Val_6", "pressure_std"),
    "temperature_mean": ("temperature_mean",),
    "temp_spread_mean": ("temp_spread_mean", "temp_spread", "temperature_spread_mean"),
    "slope_Val_1": ("slope_Val_1", "screw_speed_trend"),
    "slope_Val_6": ("slope_Val_6", "pressure_trend"),
    "slope_temperature": ("slope_temperature", "temperature_trend"),
    "temperature_direction": ("temperature_direction",),
    "valid_fraction": ("valid_fraction",),
}


def _feature_float(features: dict, ml_name: str) -> float:
    for key in _LIVE_FEATURE_ALIASES.get(ml_name, (ml_name,)):
        if key in features and features[key] is not None:
            try:
                return float(features[key])
            except (TypeError, ValueError):
                return 0.0
    return 0.0


def _row_for_columns(features: dict, columns: list[str]) -> list[float]:
    return [_feature_float(features, name) for name in columns]


class AnomalyScorer:
    """Load ready anomaly models once and score incoming feature dicts."""

    def __init__(self) -> None:
        # preload all available models at startup
        self.models: dict[str, object] = {}
        self.scalers: dict[str, object] = {}
        self._feature_columns_by_state: dict[str, list[str]] = {}
        self._load_all_models()

    def _load_all_models(self) -> None:
        # only loads models with status=ready (load_model enforces registry + disk)
        for state in MODEL_REGISTRY:
            model, scaler = load_model(state)
            if model is not None and scaler is not None:
                self.models[state] = model
                self.scalers[state] = scaler
                self._feature_columns_by_state[state] = list(FEATURE_COLUMNS)
        logging.info(
            "AnomalyScorer ML_OUTPUT_DIR=%s | loaded states=%s",
            config.ML_OUTPUT_DIR,
            list(self.models.keys()),
        )

    def score(self, features: dict, confirmed_state: str | None) -> dict:
        # main entry — scores live window against state model
        # negative score = more anomalous
        # positive score = more normal
        if not confirmed_state or confirmed_state not in self.models:
            # no model available for this state yet
            return {
                "ml_anomaly_score": None,
                "ml_is_anomaly": None,
                "ml_model_status": "no_model_for_state",
            }

        model = self.models[confirmed_state]
        scaler = self.scalers[confirmed_state]
        cols = self._feature_columns_by_state.get(confirmed_state, FEATURE_COLUMNS)
        live = features or {}
        # maps live FeatureEngine names to ML training column names
        feature_map = {
            "mean_Val_1": live.get("screw_speed_mean", 0),
            "std_Val_1": live.get("screw_speed_std", 0),
            "mean_Val_5": live.get("load_mean", 0),
            "std_Val_5": live.get("load_std", 0),
            "mean_Val_6": live.get("pressure_mean", 0),
            "std_Val_6": live.get("pressure_std", 0),
            "temperature_mean": live.get("temperature_mean", 0),
            # temp_spread from live engine maps to temp_spread_mean
            "temp_spread_mean": live.get("temp_spread", 0),
            "slope_Val_1": live.get("screw_speed_trend", 0),
            "slope_Val_6": live.get("pressure_trend", 0),
            "slope_temperature": live.get("temperature_trend", 0),
            "temperature_direction": live.get("temperature_direction", 0),
            "valid_fraction": live.get("valid_fraction", 1.0),
        }
        import pandas as pd

        X = pd.DataFrame([feature_map], columns=cols)
        X_scaled = scaler.transform(X)
        # pass DataFrame to match scaler training format
        # fixes sklearn feature names warning

        score = float(model.decision_function(X_scaled)[0])
        is_anomaly = bool(model.predict(X_scaled)[0] == -1)

        return {
            "ml_anomaly_score": round(score, 4),
            "ml_is_anomaly": is_anomaly,
            "ml_model_status": "evaluated",
        }
