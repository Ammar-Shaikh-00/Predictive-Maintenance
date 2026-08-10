from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class LiveProcessWindowBase(BaseModel):
    machine_id: Optional[UUID] = None
    line_id: Optional[int] = None
    production_run_id: Optional[int] = None
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    row_count: Optional[int] = None
    valid_fraction: Optional[float] = None
    invalid_fraction: Optional[float] = None
    outlier_fraction: Optional[float] = None
    avg_pressure: Optional[float] = None
    avg_speed: Optional[float] = None
    avg_temp: Optional[float] = None
    avg_load: Optional[float] = None
    min_pressure: Optional[float] = None
    max_pressure: Optional[float] = None
    min_speed: Optional[float] = None
    max_speed: Optional[float] = None
    pressure_std: Optional[float] = None
    speed_std: Optional[float] = None
    temp_std: Optional[float] = None
    pressure_range: Optional[float] = None
    speed_range: Optional[float] = None
    temp_range: Optional[float] = None
    pressure_slope: Optional[float] = None
    speed_slope: Optional[float] = None
    temp_slope: Optional[float] = None
    pressure_per_rpm: Optional[float] = None
    temp_spread: Optional[float] = None
    load_per_pressure: Optional[float] = None
    candidate_state: Optional[str] = None
    confirmed_state: Optional[str] = None
    confirmation_count: Optional[int] = None


class LiveProcessWindowCreate(LiveProcessWindowBase):
    pass


class LiveProcessWindowRead(LiveProcessWindowBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LiveProcessWindowResponse(LiveProcessWindowRead):
    pass