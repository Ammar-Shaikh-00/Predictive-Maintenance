from sqlalchemy import Column, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class AlertContext(Base):
    __tablename__ = "alert_context"

    id = Column(Integer, primary_key=True, index=True)

    default_sensor_id = Column(Integer, ForeignKey("default_sensor.id"), nullable=False)

    production = Column(Boolean, default=False)
    heating_up = Column(Boolean, default=False)
    ready = Column(Boolean, default=False)
    off = Column(Boolean, default=False)
    cooling_down = Column(Boolean, default=False)

    sensor = relationship("DefaultSensor")