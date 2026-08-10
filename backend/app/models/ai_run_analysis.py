from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID 

class AiRunAnalysis(Base):
    __tablename__ = "ai_run_analysis"

    production_run_id = Column(Integer, ForeignKey("production_run.id"), nullable=False)

    detected_profile_id = Column(String)
    confidence = Column(Float)

    closest_historical_profile = Column(String)
    baseline_used = Column(String)

    material_variant_inferred = Column(String)

    drift_score = Column(Float)
    quality_risk_score = Column(Float)
    anomaly_score = Column(Float)

    transition_detected_flag = Column(Boolean)

    similar_past_runs_json = Column(JSONB)

    explanation_text = Column(Text)

    # relationship
    production_run = relationship("ProductionRun", back_populates="ai_run_analysis")