from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, and_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.live_feature_evaluation import LiveFeatureEvaluation
from app.models.live_process_window import LiveProcessWindow
from app.schemas.live_feature_evaluation import (
    LiveFeatureEvaluationCreate,
    LiveFeatureEvaluationRead,
)

router = APIRouter(prefix="/live-feature-evaluations", tags=["Live Feature Evaluations"])


@router.post("", response_model=LiveFeatureEvaluationRead, status_code=status.HTTP_201_CREATED)
async def create_live_feature_evaluation(
    payload: LiveFeatureEvaluationCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        record = LiveFeatureEvaluation(**payload.model_dump())
        # print(record.created_at)
        # print("record >>>>>>>>>>>>>>>>>>")
        # print(record)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.exception("Failed to create live feature evaluation: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to create live feature evaluation")


@router.get("", response_model=list[LiveFeatureEvaluationRead])
async def get_live_feature_evaluations(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    live_process_window_id: int | None = Query(None),
    live_run_evaluation_id: int | None = Query(None),
):
    query = select(LiveFeatureEvaluation)
    if live_process_window_id is not None:
        query = query.where(
            LiveFeatureEvaluation.live_process_window_id == live_process_window_id
        )
    if live_run_evaluation_id is not None:
        query = query.where(
            LiveFeatureEvaluation.live_run_evaluation_id == live_run_evaluation_id
        )
    query = query.order_by(LiveFeatureEvaluation.id.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    return result.scalars().all()



@router.get(
    "/reference-data",
    response_model=list[LiveFeatureEvaluationRead]
)
async def get_live_feature_evaluations(
    prod_run_id: int,
    session: AsyncSession = Depends(get_session),
    
):

    query = select(LiveProcessWindow)

    if prod_run_id is not None:

        query = query.where(
            and_(
                LiveProcessWindow.production_run_id == prod_run_id,
                LiveProcessWindow.confirmed_state.in_(
                    ["PRODUCTION", "LOW_PRODUCTION"]
                )
            )
        )

    query = (
        query
        .order_by(LiveProcessWindow.id.desc())
        .limit(1)
    )

    result = await session.execute(query)

    latest_window = result.scalars().first()

    if latest_window is None:
        return []

    second_query = (
        select(LiveFeatureEvaluation)
        .where(
            LiveFeatureEvaluation.live_process_window_id
            == latest_window.id
        )
        .order_by(
            LiveFeatureEvaluation.id.desc()
        )
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
