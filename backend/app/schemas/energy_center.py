from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import ORMBase


class EnergySettingsUpsert(BaseModel):
    company_id: str = "default"
    co2_kg_per_kwh: Optional[float] = None
    euro_per_kwh: Optional[float] = None
    baseline_period_kwh: Optional[float] = None
    currency: str = "EUR"


class EnergySettingsRead(ORMBase, EnergySettingsUpsert):
    pass
