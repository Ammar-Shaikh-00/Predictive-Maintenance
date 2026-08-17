from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.live_process_window import LiveProcessWindow
from app.schemas.live_process_window import LiveProcessWindowCreate, LiveProcessWindowRead
from app.services.live_export_service import parse_uuid, to_utc_naive

router = APIRouter(prefix="/live-process-windows", tags=["Live Process Windows"])


@router.post("", response_model=LiveProcessWindowRead, status_code=status.HTTP_201_CREATED)
async def create_live_process_window(
    payload: LiveProcessWindowCreate,
    session: AsyncSession = Depends(get_session),
):
    """Ingest from live_monitor — contract stable (do not rename fields)."""
    try:
        payload_data = payload.model_dump()
        payload_data["window_start"] = to_utc_naive(payload_data.get("window_start"))
        payload_data["window_end"] = to_utc_naive(payload_data.get("window_end"))

        record = LiveProcessWindow(**payload_data)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.exception("Failed to create live process window: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to create live process window")


@router.get("", response_model=list[LiveProcessWindowRead])
async def get_live_process_windows(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    production_run_id: Optional[int] = Query(None),
    machine_id: Optional[str] = Query(
        None, description="Machine UUID (fixed — was incorrectly typed as int)"
    ),
    date_from: Optional[datetime] = Query(
        None, description="Windows with window_end >= date_from"
    ),
    date_to: Optional[datetime] = Query(
        None, description="Windows with window_start <= date_to"
    ),
):
    """
    List windows (backward-compatible array response).
    For paginated retrain export with has_more, use GET /live-ml-export/windows.
    """
    query = select(LiveProcessWindow)
    if production_run_id is not None:
        query = query.where(LiveProcessWindow.production_run_id == production_run_id)
    if machine_id:
        try:
            mid = parse_uuid(machine_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid machine_id: {exc}") from exc
        query = query.where(LiveProcessWindow.machine_id == mid)
    start = to_utc_naive(date_from)
    end = to_utc_naive(date_to)
    if start is not None:
        query = query.where(LiveProcessWindow.window_end >= start)
    if end is not None:
        query = query.where(LiveProcessWindow.window_start <= end)

    query = query.order_by(LiveProcessWindow.id.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{record_id}", response_model=LiveProcessWindowRead)
async def get_live_process_window_by_id(
    record_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(LiveProcessWindow).where(LiveProcessWindow.id == record_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Live process window not found")
    return row
