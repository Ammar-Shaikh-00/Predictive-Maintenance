from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base


class DefaultMachineState(Base):
    __tablename__ = "default_machine_state"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    priority = Column(Integer, nullable=False)

    # Relationships
    baseline_maps = relationship("BaselineMap", back_populates="machine_state", cascade="all, delete-orphan")
    state_sensor_priorities = relationship("StateSensorPriority", back_populates="machine_state", cascade="all, delete-orphan")

