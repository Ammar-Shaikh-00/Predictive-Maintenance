"""State detection module for candidate and confirmed machine states."""

from __future__ import annotations

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
        """Confirm a state only when recent candidate windows agree."""
        # 3-window confirmation still applies on ML predictions
        self.candidate_history.append(candidate_state)
        self.candidate_history = self.candidate_history[-self.confirmation_windows :]

        if (
            len(self.candidate_history) == self.confirmation_windows
            and all(state == self.candidate_history[0] for state in self.candidate_history)
        ):
            new_confirmed = self.candidate_history[0]
        else:
            new_confirmed = None

        if new_confirmed is None:
            # keep current state if no new consensus
            return self.current_confirmed_state

        # first state ever confirmed:
        if self.current_confirmed_state is None:
            self.current_confirmed_state = new_confirmed
            self.state_window_count = 0
            return self.current_confirmed_state

        if new_confirmed == self.current_confirmed_state:
            self.state_window_count += 1
            return self.current_confirmed_state
            # staying in same state

        if self.state_window_count >= config.MIN_STATE_WINDOWS:
            # enough time in current state, allow transition
            self.current_confirmed_state = new_confirmed
            self.state_window_count = 0
            return self.current_confirmed_state

        # too soon to transition, stay in current state
        return self.current_confirmed_state

    def get_current_confirmed(self) -> str | None:
        """Return the last confirmed machine state, if available."""
        # used by other modules to read current machine state
        return self.current_confirmed_state
