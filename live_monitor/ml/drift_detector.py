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

# Canonical drift feature keys (aligned with labeled training CSVs)
DRIFT_FEATURES = [
    "mean_Val_1",
    "mean_Val_5",
    "mean_Val_6",
    "temperature_mean",
    "pressure_per_rpm",
    "load_per_pressure",
]

# Live FeatureEngine field → drift feature key
_LIVE_FEATURE_MAP: dict[str, str] = {
    "screw_speed_mean": "mean_Val_1",
    "load_mean": "mean_Val_5",
    "pressure_mean": "mean_Val_6",
    "temperature_mean": "temperature_mean",
    "pressure_per_rpm": "pressure_per_rpm",
    "load_per_pressure": "load_per_pressure",
}

# Drift feature key → column name in training CSVs
_BASELINE_CSV_COLUMNS: dict[str, tuple[str, ...]] = {
    "mean_Val_1": ("mean_Val_1",),
    "mean_Val_5": ("mean_Val_5",),
    "mean_Val_6": ("mean_Val_6",),
    "temperature_mean": ("mean_temperature_mean", "temperature_mean"),
    "pressure_per_rpm": ("mean_pressure_per_rpm", "pressure_per_rpm_mean"),
    "load_per_pressure": ("mean_load_per_pressure", "load_per_pressure_mean"),
}

_HUMAN_NAMES: dict[str, str] = {
    "mean_Val_1": "screw speed",
    "mean_Val_5": "motor load",
    "mean_Val_6": "extruder pressure",
    "temperature_mean": "temperature",
    "pressure_per_rpm": "pressure per RPM",
    "load_per_pressure": "load per pressure",
}


def human_feature_name(feature: str) -> str:
    return _HUMAN_NAMES.get(feature, feature.replace("_", " "))


class DriftDetector:
    """Track recent window features and compare rolling means to learned production baselines."""

    def __init__(self) -> None:
        self.feature_history: dict[str, deque[float]] = {
            feature: deque(maxlen=config.DRIFT_WINDOW_COUNT) for feature in DRIFT_FEATURES
        }
        self.baseline_stats: dict[str, dict[str, float]] = {}
        self._baseline_source: str | None = None
        self._load_baseline_stats()

    def _candidate_baseline_paths(self) -> list[str]:
        # Prefer 5-min live labeled set; fall back to older 30-min labeled file
        return [
            config.LIVE_LABELED_CSV,
            os.path.join(config.ML_OUTPUT_DIR, "ml_labeled_states.csv"),
        ]

    def _resolve_csv_column(self, columns: set[str], feature: str) -> str | None:
        for candidate in _BASELINE_CSV_COLUMNS.get(feature, (feature,)):
            if candidate in columns:
                return candidate
        return None

    def _load_baseline_stats(self) -> None:
        import pandas as pd

        for path in self._candidate_baseline_paths():
            if not os.path.isfile(path):
                continue
            try:
                df = pd.read_csv(path)
            except Exception as exc:
                logging.warning("Drift detector: failed reading %s (%s)", path, exc)
                continue

            if "predicted_state" not in df.columns:
                continue

            mask = df["predicted_state"].isin(["PRODUCTION", "LOW_PRODUCTION"])
            if "is_stable" in df.columns:
                mask = mask & (df["is_stable"] == True)  # noqa: E712
            stable = df.loc[mask]
            if stable.empty:
                stable = df[df["predicted_state"].isin(["PRODUCTION", "LOW_PRODUCTION"])]
            if stable.empty:
                continue

            loaded: dict[str, dict[str, float]] = {}
            columns = set(stable.columns)
            for feature in DRIFT_FEATURES:
                col = self._resolve_csv_column(columns, feature)
                if col is None:
                    continue
                series = pd.to_numeric(stable[col], errors="coerce").dropna()
                if len(series) < 5:
                    continue
                std = float(series.std())
                if std != std or std == 0.0:
                    continue
                loaded[feature] = {"mean": float(series.mean()), "std": std}

            if loaded:
                self.baseline_stats = loaded
                self._baseline_source = path
                logging.info(
                    "Drift detector baseline loaded from %s (%s features)",
                    path,
                    len(loaded),
                )
                return

        logging.warning("Drift detector: no usable labeled baseline CSV found")

    def _extract_live_value(self, features: dict[str, Any], drift_key: str) -> float | None:
        # Prefer live FeatureEngine names, then accept already-canonical keys
        for live_name, mapped in _LIVE_FEATURE_MAP.items():
            if mapped == drift_key and features.get(live_name) is not None:
                try:
                    return float(features[live_name])
                except (TypeError, ValueError):
                    pass
        if features.get(drift_key) is not None:
            try:
                return float(features[drift_key])
            except (TypeError, ValueError):
                return None
        return None

    def update(self, features: dict[str, Any], confirmed_state: str | None) -> None:
        if confirmed_state not in ("PRODUCTION", "LOW_PRODUCTION"):
            return

        for feature in DRIFT_FEATURES:
            val = self._extract_live_value(features, feature)
            if val is not None:
                self.feature_history[feature].append(val)

    def detect(self) -> dict[str, Any]:
        if not self.baseline_stats:
            return {
                "drift_detected": False,
                "drifting_features": [],
                "drift_details": {},
                "drift_status": "no_baseline",
                "baseline_source": self._baseline_source,
            }

        drifting: list[str] = []
        details: dict[str, dict[str, Any]] = {}

        for feature in DRIFT_FEATURES:
            history = list(self.feature_history[feature])
            if len(history) < config.DRIFT_WINDOW_COUNT:
                continue
            if feature not in self.baseline_stats:
                continue

            recent_mean = sum(history) / len(history)
            baseline_mean = self.baseline_stats[feature]["mean"]
            baseline_std = self.baseline_stats[feature]["std"]
            if baseline_std == 0:
                continue

            z_score = (recent_mean - baseline_mean) / baseline_std
            if abs(z_score) >= config.DRIFT_ALERT_ZSCORE:
                drifting.append(feature)
                details[feature] = {
                    "z_score": round(z_score, 3),
                    "direction": "above" if z_score > 0 else "below",
                    "recent_mean": round(recent_mean, 3),
                    "baseline_mean": round(baseline_mean, 3),
                    "display_name": human_feature_name(feature),
                }

        return {
            "drift_detected": len(drifting) > 0,
            "drifting_features": drifting,
            "drift_details": details,
            "drift_status": "evaluated",
            "baseline_source": self._baseline_source,
        }
