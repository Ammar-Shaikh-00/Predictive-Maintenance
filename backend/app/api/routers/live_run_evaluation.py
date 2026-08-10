from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.live_run_evaluation import LiveRunEvaluation
from app.schemas.live_run_evaluation import LiveRunEvaluationCreate, LiveRunEvaluationRead

router = APIRouter(prefix="/live-run-evaluations", tags=["Live Run Evaluations"])


@router.post("", response_model=LiveRunEvaluationRead, status_code=status.HTTP_201_CREATED)
async def create_live_run_evaluation(
    payload: LiveRunEvaluationCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        record = LiveRunEvaluation(**payload.model_dump())
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
):
    query = select(LiveRunEvaluation)
    if live_process_window_id is not None:
        query = query.where(LiveRunEvaluation.live_process_window_id == live_process_window_id)
    if production_run_id is not None:
        query = query.where(LiveRunEvaluation.production_run_id == production_run_id)
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
