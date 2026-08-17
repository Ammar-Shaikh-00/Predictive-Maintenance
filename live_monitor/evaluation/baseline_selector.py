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
        self._last_valid_method = None
        self._last_matched_profile_id = None

    def detect_regime(self, features) -> str | None:
        avg_pressure = features.get("pressure_mean", None)
        if avg_pressure is None:
            return None
        if avg_pressure < config.REGIME_LOW_MAX:
            return "LOW"
        if config.REGIME_MID_MIN <= avg_pressure <= config.REGIME_MID_MAX:
            return "MID"
        return "HIGH"

    def select(self, features, profile_id=None) -> dict:
        active_regime = self.detect_regime(features)
        profile_id = (
            profile_id
            if profile_id is not None
            else features.get("profile_id")
        )

        # Try 1 — Profile baseline (material/profile-specific rows in registry)
        profile_baselines = self._get_profile_baselines(profile_id, active_regime)
        if profile_baselines:
            self._last_valid_baseline = profile_baselines
            self._last_valid_regime = active_regime
            self._last_valid_method = "PROFILE"
            self._last_matched_profile_id = profile_id
            confidence = getattr(profile_baselines[0], "baseline_confidence", "MEDIUM")
            logging.info(
                "Baseline selected: PROFILE id=%s regime=%s confidence=%s rows=%s",
                profile_id,
                active_regime,
                confidence,
                len(profile_baselines),
            )
            return {
                "baseline_selection_method": "PROFILE",
                "active_regime": active_regime,
                "baseline_records": profile_baselines,
                "baseline_confidence": confidence,
                "matched_profile_id": profile_id,
            }

        # Try 2 — Regime baseline:
        regime_baselines = self._get_regime_baselines(active_regime)
        if regime_baselines:
            self._last_valid_baseline = regime_baselines
            self._last_valid_regime = active_regime
            self._last_valid_method = "REGIME"
            self._last_matched_profile_id = None
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
                "matched_profile_id": None,
            }

        # Try 3 — Last known valid baseline:
        if self._last_valid_baseline:
            logging.warning(
                "No baseline for regime=%s profile=%s, using last valid method=%s regime=%s",
                active_regime,
                profile_id,
                self._last_valid_method,
                self._last_valid_regime,
            )
            return {
                "baseline_selection_method": "LAST_VALID",
                "active_regime": active_regime,
                "baseline_records": self._last_valid_baseline,
                "baseline_confidence": "LOW",
                "matched_profile_id": self._last_matched_profile_id,
            }

        # Try 4 — No baseline available:
        logging.warning(
            "No baseline available for regime=%s profile=%s",
            active_regime,
            profile_id,
        )
        return {
            "baseline_selection_method": "NONE",
            "active_regime": active_regime,
            "baseline_records": None,
            "baseline_confidence": None,
            "matched_profile_id": None,
        }

    def _get_regime_baselines(self, regime) -> list:
        if regime is None:
            return []
        try:
            rows = self.client.get_baseline_registry(regime_type=regime, limit=1000)
        except Exception as exc:
            logging.warning("Failed to fetch baseline_registry from backend: %s", exc)
            return []

        # Prefer regime-only rows (no profile_id) when selecting REGIME method
        records = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            if row.get("profile_id") not in (None, "", 0, "0"):
                continue
            if str(row.get("regime_type") or "").upper() == "STRING":
                continue
            records.append(SimpleNamespace(**row))
        return records

    def _get_profile_baselines(self, profile_id, regime: str | None) -> list:
        if profile_id is None or profile_id == "":
            return []
        try:
            rows = self.client.get_baseline_registry(limit=1000)
        except Exception as exc:
            logging.warning("Failed to fetch profile baselines: %s", exc)
            return []

        matched = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            if not self._profile_ids_equal(row.get("profile_id"), profile_id):
                continue
            if regime and row.get("regime_type"):
                if str(row.get("regime_type")).upper() != str(regime).upper():
                    # keep profile rows even if regime differs only when regime missing
                    continue
            matched.append(SimpleNamespace(**row))

        # If regime filter emptied a valid profile set, retry without regime gate
        if not matched:
            for row in rows:
                if not isinstance(row, dict):
                    continue
                if self._profile_ids_equal(row.get("profile_id"), profile_id):
                    matched.append(SimpleNamespace(**row))
        return matched

    @staticmethod
    def _profile_ids_equal(left, right) -> bool:
        if left is None or right is None:
            return False
        try:
            return int(left) == int(right)
        except (TypeError, ValueError):
            return str(left).strip().lower() == str(right).strip().lower()
