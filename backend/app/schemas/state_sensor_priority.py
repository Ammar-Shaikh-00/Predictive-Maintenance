from pydantic import BaseModel
from typing import Optional

# -------------------- State Sensor Priority --------------------
class StateSensorPriorityOut(BaseModel):
    id: int
    machine_state_id: int
    sensor_id: int
    priority: int

    class Config:
        from_attributes = True