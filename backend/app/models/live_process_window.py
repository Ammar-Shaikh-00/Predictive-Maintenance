from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID 

class LiveProcessWindow(Base):
    """Calculated live rolling-window feature and state snapshot."""

    __tablename__ = "live_process_window"

    id = Column(Integer, primary_key=True, autoincrement=True)

    machine_id = Column(UUID(as_uuid=True), ForeignKey('machine.id'), nullable=True)
    line_id = Column(Integer)

    production_run_id = Column(Integer, ForeignKey("production_run.id"), nullable=True)

    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)

    row_count = Column(Integer)

    valid_fraction = Column(Float)
    invalid_fraction = Column(Float)
    outlier_fraction = Column(Float)

    # -------------------------
    # Raw aggregated features
    # -------------------------
    avg_pressure = Column(Float)
    avg_speed = Column(Float)
    avg_temp = Column(Float)
    avg_load = Column(Float)

    min_pressure = Column(Float)
    max_pressure = Column(Float)

    min_speed = Column(Float)
    max_speed = Column(Float)

    pressure_std = Column(Float)
    speed_std = Column(Float)
    temp_std = Column(Float)

    pressure_range = Column(Float)
    speed_range = Column(Float)
    temp_range = Column(Float)

    pressure_slope = Column(Float)
    speed_slope = Column(Float)
    temp_slope = Column(Float)

    # -------------------------
    # Derived features
    # -------------------------
    pressure_per_rpm = Column(Float)
    temp_spread = Column(Float)
    load_per_pressure = Column(Float)

    # -------------------------
    # State info
    # -------------------------
    candidate_state = Column(String)
    confirmed_state = Column(String)
    confirmation_count = Column(Integer)

    # relationship
    production_run = relationship("ProductionRun", back_populates="live_process_windows")