from pydantic import BaseModel

class AlertServiceBase(BaseModel):
    status: bool

class AlertServiceResponse(AlertServiceBase):
    id: int

    class Config:
        from_attributes = True