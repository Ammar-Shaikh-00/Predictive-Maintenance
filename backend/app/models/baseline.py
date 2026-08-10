from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base


# -------------------- Baseline --------------------
class Baseline(Base):
    __tablename__ = "baseline"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    # Relationships
    baseline_maps = relationship("BaselineMap", back_populates="baseline", cascade="all, delete-orphan")

