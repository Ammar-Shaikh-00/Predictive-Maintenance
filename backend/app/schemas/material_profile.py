from pydantic import BaseModel
from typing import List

class ThresholdCreate(BaseModel):
    sensor_id: int
    min_value: float
    max_value: float

class MaterialProfileCreate(BaseModel):
    name: str
    active: bool = True
    thresholds: List[ThresholdCreate]


class ThresholdRead(BaseModel):
    sensor_id: int
    min_value: float
    max_value: float

    class Config:
        from_attributes = True


class MaterialProfileRead(BaseModel):
    id: int
    name: str
    active: bool
    thresholds: List[ThresholdRead]

    class Config:
        from_attributes = True