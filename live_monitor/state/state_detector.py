"""State detection module for candidate and confirmed machine states."""

from __future__ import annotations

import logging
import os

import joblib

import config

# feature order must match train_state_classifier.py — no threshold rules here
_FEATURE_COLUMNS = [
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


class StateDetector:
    """Detect candidate and confirmed states via ML classifier (no rule-based thresholds)."""

    def __init__(self) -> None:
        """Initialize confirmation tracking and load trained state classifier."""
        # stores last 3 candidate states for confirmation logic
        self.candidate_history: list[str] = []
        # we need 3 consecutive matching states to confirm a state change
        self.confirmation_windows = config.CONFIRMATION_WINDOWS
        self.current_confirmed_state: str | None = None
        self.state_window_count = 0
        # tracks how long we've been in current state

        # ML replaces former if/elif blocks (OFF < 5, PRODUCTION >= 50, etc.)
        self.classifier = joblib.load(
            os.path.join(config.ML_OUTPUT_DIR, "state_classifier.pkl")
        )
        self.scaler = joblib.load(
            os.path.join(config.ML_OUTPUT_DIR, "state_classifier_scaler.pkl")
        )

    def detect_candidate(self, features: dict[str, float]) -> str:
        """Predict candidate state from window features using the trained classifier."""
        # maps live FeatureEngine names to ML training column names
        feature_map = {
            "mean_Val_1": features.get("screw_speed_mean", 0),
            "std_Val_1": features.get("screw_speed_std", 0),
            "mean_Val_5": features.get("load_mean", 0),
            "std_Val_5": features.get("load_std", 0),
            "mean_Val_6": features.get("pressure_mean", 0),
            "std_Val_6": features.get("pressure_std", 0),
            "temperature_mean": features.get("temperature_mean", 0),
            "temp_spread_mean": features.get("temp_spread", 0),
            "slope_Val_1": features.get("screw_speed_trend", 0),
            "slope_Val_6": features.get("pressure_trend", 0),
            "slope_temperature": features.get("temperature_trend", 0),
            "temperature_direction": features.get("temperature_direction", 0),
            "valid_fraction": features.get("valid_fraction", 1.0),
        }

        import pandas as pd

        X = pd.DataFrame([feature_map], columns=_FEATURE_COLUMNS)
        X_scaled = self.scaler.transform(X)
        # pass DataFrame to match scaler training format
        # fixes sklearn feature names warning
        predicted = self.classifier.predict(X_scaled)[0]
        # ML predicts state, no hardcoded rules

        return str(predicted)

    def confirm_state(self, candidate_state: str) -> str | None:
        """Confirm a state only when recent candidate windows agree.

        MIN_STATE_WINDOWS is time spent in the *current* confirmed state (every
        cycle), so a fast move to a new candidate cannot freeze transitions forever.
        """
        self.candidate_history.append(candidate_state)
        self.candidate_history = self.candidate_history[-self.confirmation_windows :]

        if (
            len(self.candidate_history) == self.confirmation_windows
            and all(state == self.candidate_history[0] for state in self.candidate_history)
        ):
            new_confirmed = self.candidate_history[0]
        else:
            new_confirmed = None

        # First confirmation ever
        if self.current_confirmed_state is None:
            if new_confirmed is None:
                return None
            self.current_confirmed_state = new_confirmed
            self.state_window_count = 1
            return self.current_confirmed_state

        # Count time in the active confirmed state every cycle (anti-flicker timer)
        self.state_window_count += 1

        if new_confirmed is None or new_confirmed == self.current_confirmed_state:
            return self.current_confirmed_state

        # New consensus differs — allow transition only after minimum dwell time
        if self.state_window_count >= config.MIN_STATE_WINDOWS:
            logging.info(
                "State transition %s → %s after %s windows",
                self.current_confirmed_state,
                new_confirmed,
                self.state_window_count,
            )
            self.current_confirmed_state = new_confirmed
            self.state_window_count = 0
            return self.current_confirmed_state

        logging.info(
            "Hold %s (want %s) — dwell %s/%s windows",
            self.current_confirmed_state,
            new_confirmed,
            self.state_window_count,
            config.MIN_STATE_WINDOWS,
        )
        return self.current_confirmed_state

    def get_current_confirmed(self) -> str | None:
        """Return the last confirmed machine state, if available."""
        return self.current_confirmed_state

    def reload_models(self) -> bool:
        """Hot-reload classifier + scaler from disk after retrain (no pipeline restart)."""
        classifier_path = os.path.join(config.ML_OUTPUT_DIR, "state_classifier.pkl")
        scaler_path = os.path.join(config.ML_OUTPUT_DIR, "state_classifier_scaler.pkl")
        if not (os.path.isfile(classifier_path) and os.path.isfile(scaler_path)):
            logging.warning("StateDetector reload skipped — model files missing")
            return False
        try:
            self.classifier = joblib.load(classifier_path)
            self.scaler = joblib.load(scaler_path)
            logging.info("StateDetector models hot-reloaded from %s", config.ML_OUTPUT_DIR)
            return True
        except Exception:
            logging.exception("StateDetector reload failed")
            return False
