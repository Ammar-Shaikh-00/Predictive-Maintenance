from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID


class ProductionRun(Base):
    __tablename__ = "production_run"

    id = Column(Integer, primary_key=True, autoincrement=True)
    line_id = Column(Integer)
    machine_id = Column(UUID(as_uuid=True), ForeignKey('machine.id'), nullable=True)

    product_name = Column(String)
    product_code = Column(String)
    customer_order = Column(String)

    batch_no = Column(String)
    recipe_id = Column(String)

    material_name = Column(String)
    material_type = Column(String)
    material_grade = Column(String)
    supplier = Column(String)

    virgin_recycled_mix = Column(String)
    recycled_percentage = Column(Float)

    silo_path = Column(String)
    input_source = Column(String)

    co_extruder_active = Column(Boolean, default=False)

    operator_name = Column(String)
    shift = Column(String)

    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))

    status = Column(String)

    # Module 8 — current order fields (nullable until ERP/MES connected)
    tool_name = Column(String, nullable=True)
    target_qty = Column(Float, nullable=True)
    actual_qty = Column(Float, nullable=True)
    progress_pct = Column(Float, nullable=True)
    eta_at = Column(DateTime(timezone=True), nullable=True)

    material_profile_id = Column(UUID(as_uuid=True), ForeignKey("material_profile.id"))

    # relationships
    quality_records = relationship("QualityRecord", back_populates="production_run")
    ai_run_analysis = relationship("AiRunAnalysis", back_populates="production_run")
    live_process_windows = relationship("LiveProcessWindow", back_populates="production_run")