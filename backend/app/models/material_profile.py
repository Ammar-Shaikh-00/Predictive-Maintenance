from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base

class MaterialProfile(Base):
    __tablename__ = "material_profile"

    name = Column(String, nullable=False)
    product_family = Column(String, nullable = True)
    material_type = Column(String, nullable = True)
    active = Column(Boolean, default=True)
    thresholds = relationship("ProfileThreshold", back_populates="material")