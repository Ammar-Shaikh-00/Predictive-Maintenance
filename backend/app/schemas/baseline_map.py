from pydantic import BaseModel
from typing import Optional,List



# -------------------- Baseline Map --------------------


class SensorMappingIn(BaseModel):
    sensor_id: int
    min_value: Optional[int] = None
    max_value: Optional[int] = None


class MachineStateMappingIn(BaseModel):
    machine_state_id: int
    mappings: List[SensorMappingIn]


class BaselineFullIn(BaseModel):
    baseline_name: str
    mappings: List[MachineStateMappingIn]





class SensorMappingOut(BaseModel):
    sensor_id: int
    min_value: Optional[int]
    max_value: Optional[int]


class MachineStateMappingOut(BaseModel):
    machine_state_id: int
    mappings: List[SensorMappingOut]


class BaselineFullOut(BaseModel):
    id: int
    baseline_name: str
    mappings: List[MachineStateMappingOut]