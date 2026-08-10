from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LiveFeatureEvaluationBase(BaseModel):
    live_process_window_id: Optional[int] = None
    live_run_evaluation_id: Optional[int] = None
    feature_name: Optional[str] = None
    current_value: Optional[float] = None
    baseline_id: Optional[int] = None
    baseline_mean: Optional[float] = None
    baseline_std: Optional[float] = None
    baseline_warning_low: Optional[float] = None
    baseline_warning_high: Optional[float] = None
    baseline_critical_low: Optional[float] = None
    baseline_critical_high: Optional[float] = None
    deviation_abs: Optional[float] = None
    deviation_pct: Optional[float] = None
    z_score: Optional[float] = None
    feature_status: Optional[str] = None


class LiveFeatureEvaluationCreate(LiveFeatureEvaluationBase):
    pass


class LiveFeatureEvaluationRead(LiveFeatureEvaluationBase):
    id: int
    created_at: datetime 

    class Config:
        from_attributes = True
