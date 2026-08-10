from datetime import datetime

from pydantic import BaseModel, Field


class HistoricalRunListItem(BaseModel):
    """One production run row for GET /historical-run/."""

    run_id: int
    product: str | None = Field(default=None, description="product_name, or product_code if name missing")
    machine_name: str | None = None
    line_id: int | None = None
    start_time: datetime
    duration: float = Field(description="Seconds from start_time to end_time, or to now if end_time is null")
    scrap_percentage: float | None = None
    status: str | None = None

    class Config:
        from_attributes = True


class HistoricalScrapDistributionResponse(BaseModel):
    """Scrap % histogram for production runs in a recent window."""

    good_scrap_runs: int = Field(description="Runs with scrap % in [0, 25] (missing QC treated as 0)")
    warning_scrap_runs: int = Field(description="Runs with scrap % in (25, 50]")
    critical_scrap_runs: int = Field(description="Runs with scrap % > 50 (includes 50–100% and above)")

    class Config:
        json_schema_extra = {
            "example": {
                "good_scrap_runs": 80,
                "warning_scrap_runs": 15,
                "critical_scrap_runs": 5,
            }
        }


class HistoricalRunStatusResponse(BaseModel):
    """Aggregates for production runs in a recent time window."""

    total_runs: int = Field(description="Number of production runs whose start_time falls in the window")
    Average_scrap: float = Field(
        description="Sum of quality_record.scrap_percentage per run (missing QC as 0) divided by total_runs"
    )
    Average_duration: float = Field(
        description="Mean run length in seconds (end_time - start_time); if end_time is null, current UTC is used"
    )
    normal_runs: int = Field(
        description="Runs whose majority overall_status across live_run_evaluation is NORMAL"
    )
    warning_runs: int = Field(
        description="Runs whose majority overall_status across live_run_evaluation is WARNING"
    )
    critical_runs: int = Field(
        description="Runs whose majority overall_status across live_run_evaluation is CRITICAL"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "total_runs": 42,
                "Average_scrap": 2.5,
                "Average_duration": 3600.0,
                "normal_runs": 30,
                "warning_runs": 8,
                "critical_runs": 4,
            }
        }
