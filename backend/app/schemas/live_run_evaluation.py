from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# Documented serving states for ML consumers (open string kept for forward-compat).
ML_MODEL_STATUS_VALUES = (
    "READY",
    "TRAINING",
    "UNAVAILABLE",
    "DEGRADED",
    "ERROR",
    "NOT_LOADED",
    "DISABLED",
)


class LiveRunEvaluationBase(BaseModel):
    live_process_window_id: Optional[int] = None
    machine_id: Optional[UUID] = None
    line_id: Optional[int] = None
    production_run_id: Optional[int] = None
    detected_state: Optional[str] = None
    active_regime: Optional[str] = None
    matched_profile_id: Optional[int] = None
    baseline_id: Optional[int] = None
    baseline_selection_method: Optional[str] = None
    evaluation_status: Optional[str] = None
    overall_status: Optional[str] = None
    stability_status: Optional[str] = None
    drift_score: Optional[float] = None
    explanation_text: Optional[str] = None

    ml_anomaly_score: Optional[float] = Field(
        default=None,
        description="ML anomaly score from the inference model (typically 0.0–1.0).",
    )
    ml_is_anomaly: Optional[bool] = Field(
        default=None,
        description="Whether the ML model classified this window as anomalous.",
    )
    ml_model_status: Optional[str] = Field(
        default=None,
        max_length=64,
        description=(
            "Serving status of the ML model used for this evaluation "
            f"(e.g. {', '.join(ML_MODEL_STATUS_VALUES)})."
        ),
    )

    @field_validator("ml_anomaly_score")
    @classmethod
    def validate_ml_anomaly_score(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if value < 0.0 or value > 1.0:
            raise ValueError("ml_anomaly_score must be between 0.0 and 1.0 inclusive")
        return float(value)

    @field_validator("ml_model_status")
    @classmethod
    def normalize_ml_model_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = str(value).strip()
        if not cleaned:
            return None
        return cleaned.upper()


class LiveRunEvaluationCreate(LiveRunEvaluationBase):
    """Create payload.

    Accepts legacy ``anomaly_score`` for backward compatibility and maps it to
    ``ml_anomaly_score`` when the new field is omitted.
    """

    anomaly_score: Optional[float] = Field(
        default=None,
        exclude=True,
        description="Deprecated alias for ml_anomaly_score.",
    )

    @model_validator(mode="before")
    @classmethod
    def map_legacy_anomaly_score(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        payload = dict(data)
        if payload.get("ml_anomaly_score") is None and payload.get("anomaly_score") is not None:
            payload["ml_anomaly_score"] = payload["anomaly_score"]
        return payload


class LiveRunEvaluationRead(LiveRunEvaluationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
