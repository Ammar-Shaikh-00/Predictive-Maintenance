from sqlalchemy import Column, Integer, String, ForeignKey
from app.models.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

class DefaultSensor(Base):
    __tablename__ = "default_sensor"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(UUID(as_uuid=True), ForeignKey('machine.id'), nullable=True)
    name = Column(String, nullable=False)
    map_val = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    description = Column(String, nullable=True)
    thresholds = relationship("ProfileThreshold", back_populates="sensor")