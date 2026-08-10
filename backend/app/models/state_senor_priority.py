from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base


class StateSensorPriority(Base):
    __tablename__ = "state_sensor_priority"

    id = Column(Integer, primary_key=True, index=True)

    machine_state_id = Column(Integer, ForeignKey("default_machine_state.id", ondelete="CASCADE"), nullable=False)
    sensor_id = Column(Integer, ForeignKey("default_sensor.id", ondelete="CASCADE"), nullable=False)

    priority = Column(Integer, nullable=False)

    # Relationships
    machine_state = relationship("DefaultMachineState", back_populates="state_sensor_priorities")
    sensor = relationship("DefaultSensor")

    # Prevent duplicate entries
    __table_args__ = (
        Index("idx_state_sensor_unique", "machine_state_id", "sensor_id", unique=True),
    )