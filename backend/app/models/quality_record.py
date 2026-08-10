from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID 

class QualityRecord(Base):
    __tablename__ = "quality_record"

    production_run_id = Column(Integer, ForeignKey("production_run.id"), nullable=False)
    quality_status = Column(String)
    scrap_amount = Column(Float)
    scrap_percentage = Column(Float)
    defect_type = Column(String)
    defect_description = Column(Text)
    visual_defect_flag = Column(Boolean)
    dimensional_issue_flag = Column(Boolean)
    surface_issue_flag = Column(Boolean)
    color_deviation_flag = Column(Boolean)
    density_weight_issue_flag = Column(Boolean)
    customer_complaint_reference = Column(String)
    internal_qc_result = Column(String)
    lab_result = Column(String)
    rework_flag = Column(Boolean)
    downgrade_flag = Column(Boolean)
    shift_issue_flag = Column(Boolean)
    changeover_issue_flag = Column(Boolean)
    stop_start_instability_flag = Column(Boolean)
    notes = Column(Text)

    # relationship
    production_run = relationship("ProductionRun", back_populates="quality_records")