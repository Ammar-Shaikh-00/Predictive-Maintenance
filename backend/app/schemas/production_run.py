from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import UUID


class ProductionRunBase(BaseModel):
    line_id: int
    machine_id: UUID

    product_name: Optional[str] = None
    product_code: Optional[str] = None
    material_name: Optional[str] = None
    material_type: Optional[str] = None
    material_grade: Optional[str] = None
    supplier: Optional[str] = None
    customer_order: Optional[str] = None
    batch_no: Optional[str] = None
    silo_path: Optional[str] = None

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = "RUNNING"

    tool_name: Optional[str] = None
    target_qty: Optional[float] = None
    actual_qty: Optional[float] = None
    progress_pct: Optional[float] = None
    eta_at: Optional[datetime] = None


class ProductionRunCreate(ProductionRunBase):
    pass


class ProductionRunResponse(ProductionRunBase):
    id: int
    # DERIVED helpers for Module 8 cockpit (never ML)
    elapsed_minutes: Optional[float] = None
    derived_progress_pct: Optional[float] = None

    class Config:
        from_attributes = True


class ProductionRunOrderBoard(BaseModel):
    """Module 8 Current Order board — production-ready aggregate."""

    run: Optional[ProductionRunResponse] = None
    machine_name: Optional[str] = None
    fields: Dict[str, Any] = Field(default_factory=dict)
    empty: bool = True
    message: Optional[str] = None