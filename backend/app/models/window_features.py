from sqlalchemy import Column, DateTime, Float, Integer
from datetime import datetime

from app.models.base import Base


class WindowFeatures(Base):
    """Persisted feature snapshot for one processed rolling window."""

    __tablename__ = "window_features"

    id = Column(Integer, primary_key=True, autoincrement=True)
    window_start = Column(DateTime)
    window_end = Column(DateTime)
    screw_speed_mean = Column(Float)
    screw_speed_std = Column(Float)
    screw_speed_trend = Column(Float)
    pressure_mean = Column(Float)
    pressure_std = Column(Float)
    pressure_trend = Column(Float)
    temperature_mean = Column(Float)
    temperature_std = Column(Float)
    temperature_trend = Column(Float)
    load_mean = Column(Float)
    load_std = Column(Float)
    load_trend = Column(Float)
    pressure_per_rpm = Column(Float)
    temp_spread = Column(Float)
    load_per_pressure = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
