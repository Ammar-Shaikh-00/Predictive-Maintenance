from sqlalchemy import Boolean, Column, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class LiveRunEvaluation(Base):
    """Top-level evaluation outcome for one live process window.

    ML anomaly fields are written by the AI/ML inference pipeline:
    - ml_anomaly_score: continuous score typically in [0.0, 1.0]
    - ml_is_anomaly: thresholded boolean decision from the model
    - ml_model_status: serving state of the model used for this evaluation
    """

    __tablename__ = "live_run_evaluation"
    __table_args__ = (
        Index("ix_live_run_evaluation_ml_is_anomaly", "ml_is_anomaly"),
        Index("ix_live_run_evaluation_ml_model_status", "ml_model_status"),
    )

    # Override Base UUID PK — this table uses integer surrogate keys.
    id = Column(Integer, primary_key=True, autoincrement=True)
    live_process_window_id = Column(
        Integer,
        ForeignKey("live_process_window.id", ondelete="SET NULL"),
        nullable=True,
    )
    machine_id = Column(
        UUID(as_uuid=True),
        ForeignKey("machine.id", ondelete="SET NULL"),
        nullable=True,
    )
    line_id = Column(Integer, nullable=True)
    production_run_id = Column(
        Integer,
        ForeignKey("production_run.id", ondelete="SET NULL"),
        nullable=True,
    )
    detected_state = Column(String)
    active_regime = Column(String, nullable=True)
    matched_profile_id = Column(Integer, nullable=True)
    baseline_id = Column(Integer, nullable=True)
    baseline_selection_method = Column(String, nullable=True)
    evaluation_status = Column(String)
    overall_status = Column(String, nullable=True)
    stability_status = Column(String, nullable=True)
    drift_score = Column(Float, nullable=True)
    explanation_text = Column(String, nullable=True)

    # ML anomaly outputs (renamed from anomaly_score → ml_anomaly_score)
    ml_anomaly_score = Column(Float, nullable=True)
    ml_is_anomaly = Column(Boolean, nullable=True)
    ml_model_status = Column(String(64), nullable=True)
