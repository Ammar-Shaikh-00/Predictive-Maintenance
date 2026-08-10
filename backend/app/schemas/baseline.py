from pydantic import BaseModel
from typing import Optional


# -------------------- Baseline --------------------
class BaselineOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True