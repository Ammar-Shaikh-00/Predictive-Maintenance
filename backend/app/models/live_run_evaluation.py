from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class LiveRunEvaluation(Base):
    """Top-level evaluation outcome for one live process window."""

    __tablename__ = "live_run_evaluation"

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
    anomaly_score = Column(Float, nullable=True)
    explanation_text = Column(String, nullable=True)
    # ML Layer-2 anomaly result (matches deployed backend OpenAPI)
    ml_anomaly_score = Column(Float, nullable=True)
    ml_is_anomaly = Column(Boolean, nullable=True)
    ml_model_status = Column(String, nullable=True)
