# Baseline Selector — determines active regime from live features
#               then selects the correct baseline from backend baseline_registry.
#               Selection order: PROFILE → REGIME → LAST_VALID → NONE
#               Never uses a global baseline.

import logging
from types import SimpleNamespace

import config
from storage.backend_client import BackendClient


class BaselineSelector:
    def __init__(self, client: BackendClient | None = None):
        self.client = client or BackendClient()
        self._last_valid_baseline = None
        self._last_valid_regime = None
        # cache last valid baseline for fallback chain

    def detect_regime(self, features) -> str | None:
        # pressure regime from live window — thresholds only in config.py
        avg_pressure = features.get("pressure_mean", None)

        if avg_pressure is None:
            return None

        if avg_pressure < config.REGIME_LOW_MAX:
            return "LOW"
        if config.REGIME_MID_MIN <= avg_pressure <= config.REGIME_MID_MAX:
            return "MID"
        return "HIGH"

    def select(self, features) -> dict:
        active_regime = self.detect_regime(features)

        # Try 1 — Profile baseline (reserved for future)
        # Try 2 — Regime baseline:
        regime_baselines = self._get_regime_baselines(active_regime)
        if regime_baselines:
            self._last_valid_baseline = regime_baselines
            self._last_valid_regime = active_regime
            logging.info(
                "Baseline selected: REGIME=%s confidence=%s",
                active_regime,
                regime_baselines[0].baseline_confidence,
            )
            return {
                "baseline_selection_method": "REGIME",
                "active_regime": active_regime,
                "baseline_records": regime_baselines,
                "baseline_confidence": regime_baselines[0].baseline_confidence,
            }

        # Try 3 — Last known valid baseline:
        if self._last_valid_baseline:
            logging.warning(
                "No baseline for regime=%s, using last valid regime=%s",
                active_regime,
                self._last_valid_regime,
            )
            return {
                "baseline_selection_method": "LAST_VALID",
                "active_regime": active_regime,
                "baseline_records": self._last_valid_baseline,
                "baseline_confidence": "LOW",
            }

        # Try 4 — No baseline available:
        logging.warning("No baseline available for regime=%s", active_regime)
        return {
            "baseline_selection_method": "NONE",
            "active_regime": active_regime,
            "baseline_records": None,
            "baseline_confidence": None,
        }

    def _get_regime_baselines(self, regime) -> list:
        if regime is None:
            return []
        try:
            rows = self.client.get_baseline_registry(regime_type=regime, limit=1000)
        except Exception as exc:
            logging.warning("Failed to fetch baseline_registry from backend: %s", exc)
            return []

        records = [SimpleNamespace(**row) for row in rows if isinstance(row, dict)]
        return records
