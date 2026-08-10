from pydantic import BaseModel
from typing import Optional


class AiAnalysisResponse(BaseModel):
    id: int
    production_run_id: int
    detected_profile_id: Optional[str]
    confidence: Optional[float]
    drift_score: Optional[float]
    anomaly_score: Optional[float]

    class Config:
        from_attributes = True