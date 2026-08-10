from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WindowFeaturesBase(BaseModel):
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    screw_speed_mean: Optional[float] = None
    screw_speed_std: Optional[float] = None
    screw_speed_trend: Optional[float] = None
    pressure_mean: Optional[float] = None
    pressure_std: Optional[float] = None
    pressure_trend: Optional[float] = None
    temperature_mean: Optional[float] = None
    temperature_std: Optional[float] = None
    temperature_trend: Optional[float] = None
    load_mean: Optional[float] = None
    load_std: Optional[float] = None
    load_trend: Optional[float] = None
    pressure_per_rpm: Optional[float] = None
    temp_spread: Optional[float] = None
    load_per_pressure: Optional[float] = None


class WindowFeaturesCreate(WindowFeaturesBase):
    pass


class WindowFeaturesRead(WindowFeaturesBase):
    id: int

    class Config:
        from_attributes = True
