from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MachineSensorRawResponse(BaseModel):
    """Row shape aligned with `MachineSensorRaw` + Base columns."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    machine_id: Optional[UUID] = None
    line_id: int
    timestamp: datetime
    production_run_id: Optional[int] = None

    val_1: Optional[float] = None
    val_2: Optional[float] = None
    val_3: Optional[float] = None
    val_4: Optional[float] = None
    val_5: Optional[float] = None
    val_6: Optional[float] = None
    val_7: Optional[float] = None
    val_8: Optional[float] = None
    val_9: Optional[float] = None
    val_10: Optional[float] = None
    val_11: Optional[float] = None
    val_12: Optional[float] = None
    val_14: Optional[float] = None
    val_15: Optional[float] = None
    val_19: Optional[float] = None
    val_20: Optional[float] = None
    val_21: Optional[float] = None
    val_22: Optional[float] = None
    val_23: Optional[float] = None
    val_27: Optional[float] = None
    val_28: Optional[float] = None
    val_29: Optional[float] = None
    val_30: Optional[float] = None
    val_31: Optional[float] = None
    val_32: Optional[float] = None
    val_33: Optional[float] = None
    val_34: Optional[float] = None
    val_35: Optional[float] = None
    val_36: Optional[float] = None
    val_37: Optional[float] = None
    val_38: Optional[float] = None
    val_39: Optional[float] = None
    val_40: Optional[float] = None
    val_41: Optional[float] = None
    val_42: Optional[float] = None
    val_43: Optional[float] = None
    val_44: Optional[float] = None
    val_45: Optional[float] = None
    val_46: Optional[float] = None
    val_47: Optional[float] = None
    val_48: Optional[float] = None

    tab_actual_timestamp: Optional[datetime] = None


class MachineSensorRawQueryPageResponse(BaseModel):
    """Paginated raw rows for time-range exports."""

    items: list[MachineSensorRawResponse] = Field(default_factory=list)
    limit: int = Field(..., ge=1, description="Requested page size (capped server-side).")
    offset: int = Field(..., ge=0, description="Offset into the result set.")
    has_more: bool = Field(
        ...,
        description="True if additional rows exist beyond this page (fetch with a higher offset).",
    )
    

class MachineSensorRawCreate(BaseModel):
    machine_id: Optional[UUID] = None
    line_id: Optional[int] = None
    timestamp: datetime
    production_run_id: Optional[int] = None

    val_1: Optional[float] = None
    val_2: Optional[float] = None
    val_3: Optional[float] = None
    val_4: Optional[float] = None
    val_5: Optional[float] = None
    val_6: Optional[float] = None
    val_7: Optional[float] = None
    val_8: Optional[float] = None
    val_9: Optional[float] = None
    val_10: Optional[float] = None
    val_11: Optional[float] = None
    val_12: Optional[float] = None
    val_14: Optional[float] = None
    val_15: Optional[float] = None
    val_19: Optional[float] = None
    val_20: Optional[float] = None
    val_21: Optional[float] = None
    val_22: Optional[float] = None
    val_23: Optional[float] = None
    val_27: Optional[float] = None
    val_28: Optional[float] = None
    val_29: Optional[float] = None
    val_30: Optional[float] = None
    val_31: Optional[float] = None
    val_32: Optional[float] = None
    val_33: Optional[float] = None
    val_34: Optional[float] = None
    val_35: Optional[float] = None
    val_36: Optional[float] = None
    val_37: Optional[float] = None
    val_38: Optional[float] = None
    val_39: Optional[float] = None
    val_40: Optional[float] = None
    val_41: Optional[float] = None
    val_42: Optional[float] = None
    val_43: Optional[float] = None
    val_44: Optional[float] = None
    val_45: Optional[float] = None
    val_46: Optional[float] = None
    val_47: Optional[float] = None
    val_48: Optional[float] = None

    tab_actual_timestamp: Optional[datetime] = None