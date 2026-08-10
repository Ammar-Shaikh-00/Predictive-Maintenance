from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BaselineRegistryBase(BaseModel):
    regime_type: Optional[str] = None
    profile_id: Optional[int] = None
    feature_name: Optional[str] = None
    mean_value: Optional[float] = None
    std_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    p10_value: Optional[float] = None
    p90_value: Optional[float] = None
    warning_low: Optional[float] = None
    warning_high: Optional[float] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None
    sample_count: Optional[int] = None
    source_run_count: Optional[int] = None
    baseline_confidence: Optional[str] = None


class BaselineRegistryCreate(BaselineRegistryBase):
    pass


class BaselineRegistryRead(BaselineRegistryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
