
from pydantic import BaseModel


# ✅ Response Schema
class MachineStatusOut(BaseModel):
    id: int
    status: str

    class Config:
        from_attributes = True


# ✅ Update Schema
class MachineStatusUpdate(BaseModel):
    status: str