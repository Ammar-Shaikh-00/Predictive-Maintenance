from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from app.models.base import Base


class LiveFeatureEvaluation(Base):
    """Per-feature live-vs-baseline evaluation output."""

    __tablename__ = "live_feature_evaluation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    live_process_window_id = Column(
        Integer,
        ForeignKey("live_process_window.id", ondelete="SET NULL"),
        nullable=True,
    )
    live_run_evaluation_id = Column(
        Integer,
        ForeignKey("live_run_evaluation.id", ondelete="SET NULL"),
        nullable=True,
    )
    feature_name = Column(String)
    current_value = Column(Float)
    baseline_id = Column(Integer, nullable=True)
    baseline_mean = Column(Float, nullable=True)
    baseline_std = Column(Float, nullable=True)
    baseline_warning_low = Column(Float, nullable=True)
    baseline_warning_high = Column(Float, nullable=True)
    baseline_critical_low = Column(Float, nullable=True)
    baseline_critical_high = Column(Float, nullable=True)
    deviation_abs = Column(Float, nullable=True)
    deviation_pct = Column(Float, nullable=True)
    z_score = Column(Float, nullable=True)
    feature_status = Column(String)