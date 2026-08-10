from sqlalchemy import Column, Boolean, Integer
from app.models.base import Base


class AlertService(Base):
    __tablename__ = "alert_service"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(Boolean, default=True, nullable=False)