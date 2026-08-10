from pydantic import BaseModel, Field
from typing import Optional
# from sqlalchemy.dialects.postgresql import UUID
from uuid import UUID


class DefaultSensorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    # map_val: str = Field(..., min_length=1, max_length=100)
    map_val: Optional[str] = Field(..., min_length=1, max_length=100)
    machine_id: Optional[UUID] = None
    unit:Optional[str] = None
    description: Optional[str] = None
    
class DefaultSensorCreate(DefaultSensorBase):
    pass


class DefaultSensorRead(DefaultSensorBase):
    id: int

    class Config:
        from_attributes = True