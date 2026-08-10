from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import ORMBase


class MaintenancePlanCreate(BaseModel):
    company_id: str = "default"
    machine_id: Optional[str] = None
    title: str
    component: Optional[str] = None
    planned_at: Optional[datetime] = None
    status: str = "planned"
    technician: Optional[str] = None
    notes: Optional[str] = None
    value_source: str = "MANUAL"


class MaintenancePlanUpdate(BaseModel):
    machine_id: Optional[str] = None
    title: Optional[str] = None
    component: Optional[str] = None
    planned_at: Optional[datetime] = None
    status: Optional[str] = None
    technician: Optional[str] = None
    notes: Optional[str] = None


class MaintenancePlanRead(ORMBase, MaintenancePlanCreate):
    pass


class WearPartCreate(BaseModel):
    company_id: str = "default"
    machine_id: Optional[str] = None
    name: str
    part_number: Optional[str] = None
    component: Optional[str] = None
    installed_at: Optional[datetime] = None
    next_replace_at: Optional[datetime] = None
    quantity_on_hand: Optional[float] = None
    notes: Optional[str] = None
    value_source: str = "MANUAL"


class WearPartUpdate(BaseModel):
    machine_id: Optional[str] = None
    name: Optional[str] = None
    part_number: Optional[str] = None
    component: Optional[str] = None
    installed_at: Optional[datetime] = None
    next_replace_at: Optional[datetime] = None
    quantity_on_hand: Optional[float] = None
    notes: Optional[str] = None


class WearPartRead(ORMBase, WearPartCreate):
    pass


class RemainingLifeItem(BaseModel):
    machine_id: str
    remaining_useful_life: Optional[int] = None
    prediction_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    value_source: str = Field(default="MODEL_PREDICTION")
    available: bool = False
