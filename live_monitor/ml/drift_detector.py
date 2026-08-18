"""Detect slow behavior drift within production states using learned baselines."""

from __future__ import annotations

import logging
import os
import sys
from collections import deque
from pathlib import Path
from typing import Any

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402

# core features most sensitive to drift (same family as anomaly detection)
DRIFT_FEATURES = [
    "mean_Val_1",
    "mean_Val_5",
    "mean_Val_6",
    "temperature_mean",
    "pressure_per_rpm_mean",
    "load_per_pressure_mean",
]

# ml_labeled_states.csv uses prefixed column names for some aggregates
_BASELINE_CSV_COLUMNS: dict[str, str] = {
    "temperature_mean": "mean_temperature_mean",
    "pressure_per_rpm_mean": "mean_pressure_per_rpm",
    "load_per_pressure_mean": "mean_load_per_pressure",
}


def _baseline_csv_column(feature: str) -> str:
    return _BASELINE_CSV_COLUMNS.get(feature, feature)


class DriftDetector:
    """Track recent window features and compare rolling means to learned production baselines."""

    def __init__(self) -> None:
        # stores recent window values per feature
        # key = feature name, value = deque of recent values
        self.feature_history: dict[str, deque[float]] = {}
        for feature in DRIFT_FEATURES:
            self.feature_history[feature] = deque(maxlen=config.DRIFT_WINDOW_COUNT)
        self.baseline_stats: dict[str, dict[str, float]] = {}
        self._load_baseline_stats()
        # learned baseline stats from training data

    def _load_baseline_stats(self) -> None:
        # load baseline mean/std per feature from ml_labeled_states.csv stable PRODUCTION windows
        path = os.path.join(config.ML_OUTPUT_DIR, "ml_labeled_states.csv")
        if not os.path.exists(path):
            logging.warning("Drift detector: no labeled states found")
            return

        import pandas as pd

        df = pd.read_csv(path)
        stable = df[
            df["predicted_state"].isin(["PRODUCTION", "LOW_PRODUCTION"])
            & (df["is_stable"] == True)  # noqa: E712
        ]
        for feature in DRIFT_FEATURES:
            col = _baseline_csv_column(feature)
            if col not in stable.columns:
                continue
            series = stable[col].dropna()
            if series.empty:
                continue
            std = float(series.std())
            if std != std:  # NaN guard
                continue
            self.baseline_stats[feature] = {
                "mean": float(series.mean()),
                "std": std,
            }
        # baseline = what stable production looks like historically

    def update(self, features: dict[str, Any], confirmed_state: str | None) -> None:
        # called every cycle to add new window to history
        if confirmed_state not in ("PRODUCTION", "LOW_PRODUCTION"):
            return
            # only track drift during production states

        for feature in DRIFT_FEATURES:
            val = features.get(feature)
            if val is not None:
                try:
                    self.feature_history[feature].append(float(val))
                except (TypeError, ValueError):
                    pass

    def detect(self) -> dict[str, Any]:
        # compare recent windows against learned baseline
        if not self.baseline_stats:
            return {
                "drift_detected": False,
                "drifting_features": [],
                "drift_details": {},
                "drift_status": "no_baseline",
            }

        drifting: list[str] = []
        details: dict[str, dict[str, float | str]] = {}

        for feature in DRIFT_FEATURES:
            history = list(self.feature_history[feature])
            if len(history) < config.DRIFT_WINDOW_COUNT:
                continue
                # not enough history yet

            if feature not in self.baseline_stats:
                continue

            recent_mean = sum(history) / len(history)
            baseline_mean = self.baseline_stats[feature]["mean"]
            baseline_std = self.baseline_stats[feature]["std"]

            if baseline_std == 0:
                continue

            z_score = (recent_mean - baseline_mean) / baseline_std
            # how far recent behavior is from learned baseline

            if abs(z_score) >= config.DRIFT_ALERT_ZSCORE:
                drifting.append(feature)
                details[feature] = {
                    "z_score": round(z_score, 3),
                    "direction": "above" if z_score > 0 else "below",
                    "recent_mean": round(recent_mean, 3),
                    "baseline_mean": round(baseline_mean, 3),
                }

        return {
            "drift_detected": len(drifting) > 0,
            "drifting_features": drifting,
            "drift_details": details,
            "drift_status": "evaluated",
        }
        # drift = sustained deviation over multiple windows
