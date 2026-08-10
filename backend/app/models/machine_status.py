from sqlalchemy import Column, Boolean, Integer,String
from app.models.base import Base


class MachineStatus(Base):
    __tablename__ = "machine_status"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="OFF", nullable=False)