from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from app.models.base import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID 


class MachineSensorRaw(Base):
    __tablename__ = "machine_sensor_raw"

    machine_id = Column(UUID(as_uuid=True), ForeignKey('machine.id'), nullable=True)
    line_id = Column(Integer, nullable=True)

    timestamp = Column(DateTime(timezone=True), nullable=False)

    production_run_id = Column(Integer, ForeignKey("production_run.id"), nullable=True)

    # val_1 ... val_48
    val_1 = Column(Float)
    val_2 = Column(Float)
    val_3 = Column(Float)
    val_4 = Column(Float)
    val_5 = Column(Float)
    val_6 = Column(Float)
    val_7 = Column(Float)
    val_8 = Column(Float)
    val_9 = Column(Float)
    val_10 = Column(Float)
    val_11 = Column(Float)
    val_12 = Column(Float)
    val_14 = Column(Float)
    val_15 = Column(Float)
    val_19 = Column(Float)
    val_20 = Column(Float)
    val_21 = Column(Float)
    val_22 = Column(Float)
    val_23 = Column(Float)
    val_27 = Column(Float)
    val_28 = Column(Float)
    val_29 = Column(Float)
    val_30 = Column(Float)
    val_31 = Column(Float)
    val_32 = Column(Float)
    val_33 = Column(Float)
    val_34 = Column(Float)
    val_35 = Column(Float)
    val_36 = Column(Float)
    val_37 = Column(Float)
    val_38 = Column(Float)
    val_39 = Column(Float)
    val_40 = Column(Float)
    val_41 = Column(Float)
    val_42 = Column(Float)
    val_43 = Column(Float)
    val_44 = Column(Float)
    val_45 = Column(Float)
    val_46 = Column(Float)
    val_47 = Column(Float)
    val_48 = Column(Float)

    tab_actual_timestamp = Column(DateTime, default=datetime.utcnow)