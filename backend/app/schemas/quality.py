from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class QualityBase(BaseModel):
    quality_status: Optional[str] = None
    scrap_amount: Optional[float] = None
    scrap_percentage: Optional[float] = None

    defect_type: Optional[str] = None
    defect_description: Optional[str] = None

    visual_defect_flag: Optional[bool] = None
    dimensional_issue_flag: Optional[bool] = None
    surface_issue_flag: Optional[bool] = None
    color_deviation_flag: Optional[bool] = None
    density_weight_issue_flag: Optional[bool] = None

    customer_complaint_reference: Optional[str] = None
    internal_qc_result: Optional[str] = None
    lab_result: Optional[str] = None

    rework_flag: Optional[bool] = None
    downgrade_flag: Optional[bool] = None
    shift_issue_flag: Optional[bool] = None
    changeover_issue_flag: Optional[bool] = None
    stop_start_instability_flag: Optional[bool] = None

    notes: Optional[str] = None


# ✅ CREATE (no override needed)
class QualityCreate(QualityBase):
    pass


# ✅ RESPONSE
class QualityResponse(QualityBase):
    id: UUID
    production_run_id: int

    class Config:
        from_attributes = True