from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import and_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.live_feature_evaluation import LiveFeatureEvaluation
from app.models.live_process_window import LiveProcessWindow
from app.schemas.live_feature_evaluation import (
    LiveFeatureEvaluationCreate,
    LiveFeatureEvaluationRead,
)
from app.services.live_export_service import parse_uuid, to_utc_naive

router = APIRouter(prefix="/live-feature-evaluations", tags=["Live Feature Evaluations"])


@router.post("", response_model=LiveFeatureEvaluationRead, status_code=status.HTTP_201_CREATED)
async def create_live_feature_evaluation(
    payload: LiveFeatureEvaluationCreate,
    session: AsyncSession = Depends(get_session),
):
    """Ingest from live_monitor — one feature row per request (stable contract)."""
    try:
        record = LiveFeatureEvaluation(**payload.model_dump())
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.exception("Failed to create live feature evaluation: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to create live feature evaluation")


@router.get("", response_model=list[LiveFeatureEvaluationRead])
async def list_live_feature_evaluations(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    live_process_window_id: int | None = Query(None),
    live_run_evaluation_id: int | None = Query(None),
    machine_id: Optional[str] = Query(
        None, description="Filter via linked process window machine UUID"
    ),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    feature_name: Optional[str] = Query(None),
):
    """
    List feature evaluations (array response).
    For paginated retrain export: GET /live-ml-export/feature-evaluations.
    """
    need_join = machine_id is not None or date_from is not None or date_to is not None
    if need_join:
        query = select(LiveFeatureEvaluation).join(
            LiveProcessWindow,
            LiveFeatureEvaluation.live_process_window_id == LiveProcessWindow.id,
            isouter=True,
        )
        if machine_id:
            try:
                mid = parse_uuid(machine_id)
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=422, detail=f"Invalid machine_id: {exc}"
                ) from exc
            query = query.where(LiveProcessWindow.machine_id == mid)
        start = to_utc_naive(date_from)
        end = to_utc_naive(date_to)
        if start is not None:
            query = query.where(LiveProcessWindow.window_end >= start)
        if end is not None:
            query = query.where(LiveProcessWindow.window_start <= end)
    else:
        query = select(LiveFeatureEvaluation)

    if live_process_window_id is not None:
        query = query.where(
            LiveFeatureEvaluation.live_process_window_id == live_process_window_id
        )
    if live_run_evaluation_id is not None:
        query = query.where(
            LiveFeatureEvaluation.live_run_evaluation_id == live_run_evaluation_id
        )
    if feature_name:
        query = query.where(LiveFeatureEvaluation.feature_name == feature_name)

    query = query.order_by(LiveFeatureEvaluation.id.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    return result.scalars().all()


@router.get(
    "/reference-data",
    response_model=list[LiveFeatureEvaluationRead],
)
async def get_reference_feature_evaluations(
    prod_run_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Latest PRODUCTION/LOW_PRODUCTION window features for a production run."""
    query = (
        select(LiveProcessWindow)
        .where(
            and_(
                LiveProcessWindow.production_run_id == prod_run_id,
                LiveProcessWindow.confirmed_state.in_(
                    ["PRODUCTION", "LOW_PRODUCTION"]
                ),
            )
        )
        .order_by(LiveProcessWindow.id.desc())
        .limit(1)
    )
    result = await session.execute(query)
    latest_window = result.scalars().first()
    if latest_window is None:
        return []

    second_query = (
        select(LiveFeatureEvaluation)
        .where(LiveFeatureEvaluation.live_process_window_id == latest_window.id)
        .order_by(LiveFeatureEvaluation.id.desc())
    )
    result = await session.execute(second_query)
    return result.scalars().all()


@router.get("/{record_id}", response_model=LiveFeatureEvaluationRead)
async def get_live_feature_evaluation_by_id(
    record_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(LiveFeatureEvaluation).where(LiveFeatureEvaluation.id == record_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Live feature evaluation not found")
    return row
