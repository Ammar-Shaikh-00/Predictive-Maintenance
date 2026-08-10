from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base



class BaselineMap(Base):
    __tablename__ = "baseline_map"

    id = Column(Integer, primary_key=True, index=True)

    baseline_id = Column(Integer, ForeignKey("baseline.id", ondelete="CASCADE"), nullable=False)
    machine_state_id = Column(Integer, ForeignKey("default_machine_state.id", ondelete="CASCADE"), nullable=False)
    sensor_id = Column(Integer, ForeignKey("default_sensor.id", ondelete="CASCADE"), nullable=False)

    min_value = Column(Integer, nullable=True)
    max_value = Column(Integer, nullable=True)

    # Relationships
    baseline = relationship("Baseline", back_populates="baseline_maps")
    machine_state = relationship("DefaultMachineState", back_populates="baseline_maps")
    sensor = relationship("DefaultSensor")  # already exists, no back_populates required

    # Index for faster filtering
    __table_args__ = (
        Index("idx_baseline_map_lookup", "baseline_id", "machine_state_id", "sensor_id"),
    )
