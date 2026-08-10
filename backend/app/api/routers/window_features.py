from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.window_features import WindowFeatures
from app.schemas.window_features import WindowFeaturesCreate, WindowFeaturesRead

router = APIRouter(prefix="/window-features", tags=["window_features"])


def _to_utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    """Convert tz-aware datetime to UTC naive for TIMESTAMP WITHOUT TIME ZONE columns."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


@router.post("", response_model=WindowFeaturesRead, status_code=status.HTTP_201_CREATED)
async def create_window_features(
    payload: WindowFeaturesCreate,
    session: AsyncSession = Depends(get_session),
):
    logger.info(
        "POST /window-features - create request received (window_start={}, window_end={})",
        payload.window_start,
        payload.window_end,
    )

    payload_data = payload.model_dump()
    payload_data["window_start"] = _to_utc_naive(payload_data.get("window_start"))
    payload_data["window_end"] = _to_utc_naive(payload_data.get("window_end"))

    record = WindowFeatures(**payload_data)
    session.add(record)
    await session.commit()
    await session.refresh(record)

    logger.info("POST /window-features - created record id={}", record.id)
    return record


@router.get("", response_model=list[WindowFeaturesRead])
async def get_window_features(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    start_date = _to_utc_naive(start_date)
    end_date = _to_utc_naive(end_date)

    logger.info(
        "GET /window-features - list request (limit={}, offset={}, start_date={}, end_date={})",
        limit,
        offset,
        start_date,
        end_date,
    )

    query = select(WindowFeatures)
    if start_date:
        query = query.where(WindowFeatures.window_start >= start_date)
    if end_date:
        query = query.where(WindowFeatures.window_end <= end_date)

    query = query.order_by(WindowFeatures.id.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    rows = result.scalars().all()

    logger.info("GET /window-features - returned {} records", len(rows))
    return rows
