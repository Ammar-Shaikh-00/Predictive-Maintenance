from pydantic import BaseModel

class AlertContextBase(BaseModel):
    default_sensor_id: int
    production: bool
    heating_up: bool
    ready: bool
    off: bool
    cooling_down: bool

class AlertContextUpdate(AlertContextBase):
    pass

class AlertContextResponse(AlertContextBase):
    id: int

    class Config:
        from_attributes = True