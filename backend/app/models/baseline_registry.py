from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.models.base import Base


class BaselineRegistry(Base):
    """Reference baseline statistics used for live feature evaluation."""

    __tablename__ = "baseline_registry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    regime_type = Column(String)
    profile_id = Column(Integer, nullable=True)
    feature_name = Column(String)
    mean_value = Column(Float)
    std_value = Column(Float)
    min_value = Column(Float)
    max_value = Column(Float)
    p10_value = Column(Float)
    p90_value = Column(Float)
    warning_low = Column(Float, nullable=True)
    warning_high = Column(Float, nullable=True)
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)
    sample_count = Column(Integer)
    source_run_count = Column(Integer)
    baseline_confidence = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
