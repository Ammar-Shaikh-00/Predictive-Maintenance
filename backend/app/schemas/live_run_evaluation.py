from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


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
    anomaly_score: Optional[float] = None
    explanation_text: Optional[str] = None
    ml_anomaly_score: Optional[float] = None
    ml_is_anomaly: Optional[bool] = None
    ml_model_status: Optional[str] = None

    @field_validator("ml_anomaly_score")
    @classmethod
    def _ml_score_range(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if value < 0.0 or value > 1.0:
            raise ValueError("ml_anomaly_score must be between 0.0 and 1.0 inclusive")
        return value


class LiveRunEvaluationCreate(LiveRunEvaluationBase):
    pass


class LiveRunEvaluationRead(LiveRunEvaluationBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
