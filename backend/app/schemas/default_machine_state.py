from pydantic import BaseModel, Field

# -------------------- Machine State --------------------
class DefaultMachineStateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    priority: int = Field(..., ge=0)


class DefaultMachineStateCreate(DefaultMachineStateBase):
    pass


class DefaultMachineStateOut(DefaultMachineStateBase):
    id: int

    class Config:
        from_attributes = True
