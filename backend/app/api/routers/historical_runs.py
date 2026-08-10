from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.historical_run import (
    HistoricalRunListItem,
    HistoricalRunStatusResponse,
    HistoricalScrapDistributionResponse,
)
from app.services import historical_run_service

router = APIRouter(prefix="/historical-run", tags=["Historical Run"])


@router.get("/", response_model=list[HistoricalRunListItem])
async def get_all_runs(
    days: int = Query(30, ge=1, le=3650, description="Include runs with start_time in the last N days"),
    db: AsyncSession = Depends(get_session),
):
    rows = await historical_run_service.list_historical_runs(db, days)
    return rows


@router.get("/scrap-distribution", response_model=HistoricalScrapDistributionResponse)
async def get_scrap_distribution(
    days: int = Query(30, ge=1, le=3650, description="Rolling window in days (from start_time)"),
    db: AsyncSession = Depends(get_session),
):
    data = await historical_run_service.get_scrap_distribution(db, days)
    return HistoricalScrapDistributionResponse(**data)


@router.get("/status", response_model=HistoricalRunStatusResponse)
async def get_historical_run_status(
    days: int = Query(30, ge=1, le=3650, description="Rolling window in days (from start_time)"),
    db: AsyncSession = Depends(get_session),
):
    data = await historical_run_service.get_historical_status_summary(db, days)
    return HistoricalRunStatusResponse(**data)

