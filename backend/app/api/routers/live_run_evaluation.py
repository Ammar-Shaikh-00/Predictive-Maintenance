from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.live_process_window import LiveProcessWindow
from app.models.live_run_evaluation import LiveRunEvaluation
from app.schemas.live_run_evaluation import LiveRunEvaluationCreate, LiveRunEvaluationRead
from app.services.live_export_service import parse_uuid, to_utc_naive

router = APIRouter(prefix="/live-run-evaluations", tags=["Live Run Evaluations"])


@router.post("", response_model=LiveRunEvaluationRead, status_code=status.HTTP_201_CREATED)
async def create_live_run_evaluation(
    payload: LiveRunEvaluationCreate,
    session: AsyncSession = Depends(get_session),
):
    """Ingest from live_monitor — accepts ml_* fields + legacy anomaly_score alias."""
    try:
        record = LiveRunEvaluation(**payload.model_dump(exclude_none=False))
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.exception("Failed to create live run evaluation: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to create live run evaluation")


@router.get("", response_model=list[LiveRunEvaluationRead])
async def get_live_run_evaluations(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    live_process_window_id: int | None = Query(None),
    production_run_id: int | None = Query(None),
    machine_id: Optional[str] = Query(None, description="Machine UUID"),
    date_from: Optional[datetime] = Query(
        None, description="Filter via linked window_end >= date_from"
    ),
    date_to: Optional[datetime] = Query(
        None, description="Filter via linked window_start <= date_to"
    ),
    ml_is_anomaly: bool | None = Query(
        None, description="Filter by ML anomaly classification"
    ),
    ml_model_status: str | None = Query(
        None, description="Filter by ML model serving status"
    ),
):
    """
    List run evaluations (array response).
    For paginated retrain export: GET /live-ml-export/run-evaluations.
    """
    need_join = date_from is not None or date_to is not None
    if need_join:
        query = select(LiveRunEvaluation).join(
            LiveProcessWindow,
            LiveRunEvaluation.live_process_window_id == LiveProcessWindow.id,
            isouter=True,
        )
        start = to_utc_naive(date_from)
        end = to_utc_naive(date_to)
        if start is not None:
            query = query.where(LiveProcessWindow.window_end >= start)
        if end is not None:
            query = query.where(LiveProcessWindow.window_start <= end)
    else:
        query = select(LiveRunEvaluation)

    if live_process_window_id is not None:
        query = query.where(LiveRunEvaluation.live_process_window_id == live_process_window_id)
    if production_run_id is not None:
        query = query.where(LiveRunEvaluation.production_run_id == production_run_id)
    if machine_id:
        try:
            mid = parse_uuid(machine_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid machine_id: {exc}") from exc
        query = query.where(LiveRunEvaluation.machine_id == mid)
    if ml_is_anomaly is not None:
        query = query.where(LiveRunEvaluation.ml_is_anomaly.is_(ml_is_anomaly))
    if ml_model_status is not None:
        query = query.where(
            LiveRunEvaluation.ml_model_status == ml_model_status.strip().upper()
        )
    query = query.order_by(LiveRunEvaluation.id.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{record_id}", response_model=LiveRunEvaluationRead)
async def get_live_run_evaluation_by_id(
    record_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(LiveRunEvaluation).where(LiveRunEvaluation.id == record_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Live run evaluation not found")
    return row
