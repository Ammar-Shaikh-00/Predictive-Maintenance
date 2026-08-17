from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.baseline_registry import BaselineRegistry
from app.schemas.baseline_registry import BaselineRegistryCreate, BaselineRegistryRead
from app.services import baseline_registry_service as br_svc

router = APIRouter(prefix="/baseline-registry", tags=["Baseline Registry"])


@router.post("", response_model=BaselineRegistryRead, status_code=status.HTTP_201_CREATED)
async def create_baseline_registry(
    payload: BaselineRegistryCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        record = BaselineRegistry(**payload.model_dump())
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.exception("Failed to create baseline registry record: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to create baseline registry record")


@router.get("/regimes-coverage")
async def baseline_registry_regimes_coverage(
    session: AsyncSession = Depends(get_session),
):
    """Alias of /summary — avoids 422 when older servers treat /summary as {record_id}."""
    return await br_svc.baseline_registry_summary(session)


@router.get("/summary")
async def baseline_registry_summary(session: AsyncSession = Depends(get_session)):
    """HIGH/MID/LOW coverage for live_monitor alignment."""
    return await br_svc.baseline_registry_summary(session)


@router.post("/ensure-regimes")
async def ensure_baseline_regimes(
    force: bool = Query(False, description="Reserved; never overwrites existing rows"),
    session: AsyncSession = Depends(get_session),
):
    """
    Ensure HIGH/MID/LOW × core feature rows exist.
    Inserts UNVALIDATED_SEED placeholders only for missing pairs.
    Ammar should overwrite with real populate_baseline.py stats.
    """
    return await br_svc.ensure_regime_baselines(session, force=force)


@router.get("", response_model=list[BaselineRegistryRead])
async def get_baseline_registry(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    regime_type: str | None = Query(None, description="HIGH | MID | LOW"),
    feature_name: str | None = Query(None),
):
    query = select(BaselineRegistry)
    if regime_type:
        query = query.where(BaselineRegistry.regime_type == regime_type.strip().upper())
    if feature_name:
        query = query.where(BaselineRegistry.feature_name == feature_name)
    query = query.order_by(BaselineRegistry.id.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{record_id}", response_model=BaselineRegistryRead)
async def get_baseline_registry_by_id(
    record_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(BaselineRegistry).where(BaselineRegistry.id == record_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Baseline registry record not found")
    return row
