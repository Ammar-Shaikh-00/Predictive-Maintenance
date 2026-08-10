from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
from sqlalchemy.dialects.postgresql import UUID

class ProfileThreshold(Base):
    __tablename__ = "profile_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    
    sensor_id = Column(Integer, ForeignKey("default_sensor.id"))
    material_id = Column(UUID(as_uuid=True), ForeignKey("material_profile.id"))
    
    min_value = Column(Float, nullable=False)
    max_value = Column(Float, nullable=False)

    sensor = relationship("DefaultSensor")
    sensor = relationship("DefaultSensor", back_populates="thresholds")
    material = relationship("MaterialProfile", back_populates="thresholds")