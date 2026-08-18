from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException


from app.db.session import get_session

from app.schemas.production_run import (
    ProductionRunCreate,
    ProductionRunResponse,
    ProductionRunOrderBoard,
)
from app.schemas.quality import QualityCreate, QualityResponse
from app.schemas.ai_analysis import AiAnalysisResponse
from app.schemas.live_process_window import LiveProcessWindowResponse

from app.services import (
    production_run_service,
    quality_service,
    process_window_service,
    ai_analysis_service,
)
from uuid import UUID
from fastapi import Query

router = APIRouter(prefix="/production-run", tags=["Production Run"])


@router.get("/", response_model=list[ProductionRunResponse])
async def get_all_runs(
    limit: int = 10,   # default limit
    db: AsyncSession = Depends(get_session),
):
    runs = await production_run_service.get_all_runs(db, limit)
    return [production_run_service.enrich_run_dict(r) for r in runs]


@router.get("/order-board", response_model=ProductionRunOrderBoard)
async def get_order_board(
    run_id: int | None = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """
    Module 8 — Current Order cockpit payload.
    Reuses production_run + machine; never invents ETA/progress from ML.
    """
    board = await production_run_service.build_current_order_board(db, run_id=run_id)
    return ProductionRunOrderBoard.model_validate(board)


@router.post("/", response_model=ProductionRunResponse)
async def create_run(
    payload: ProductionRunCreate,
    db: AsyncSession = Depends(get_session),
):
    try:
        run = await production_run_service.create_run(db, payload)
        return production_run_service.enrich_run_dict(run)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )




@router.get(
    "/current",
    response_model=ProductionRunResponse
)
async def get_current_run(
    machine_id: UUID = Query(...),
    line_id: int = Query(...),
    db: AsyncSession = Depends(get_session),
):
    run = await production_run_service.get_current_running_run(
        db=db,
        machine_id=machine_id,
        line_id=line_id,
    )

    if not run:
        raise HTTPException(
            status_code=404,
            detail="No running production run found"
        )

    return production_run_service.enrich_run_dict(run)


@router.get("/{run_id}", response_model=ProductionRunResponse)
async def get_run(
    run_id: int,
    db: AsyncSession = Depends(get_session),
):
    run = await production_run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return production_run_service.enrich_run_dict(run)


@router.put("/{run_id}/quality", response_model=QualityResponse)
async def upsert_quality(
    run_id: int,
    payload: QualityCreate,
    db: AsyncSession = Depends(get_session),
):
    return await quality_service.upsert_quality(db, run_id, payload)


@router.get("/{run_id}/quality", response_model=QualityResponse)
async def get_quality(run_id: int, db: AsyncSession = Depends(get_session)):
    return await quality_service.get_quality_by_run(db, run_id)



@router.get("/{run_id}/process", response_model=list[LiveProcessWindowResponse])
async def get_process_data(
    run_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await process_window_service.get_windows_by_run(db, run_id)


@router.get("/{run_id}/ai", response_model=AiAnalysisResponse)
async def get_ai(
    run_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await ai_analysis_service.get_ai_by_run(db, run_id)



@router.put("/{run_id}", response_model=ProductionRunResponse)
async def update_run(
    run_id: int,
    payload: ProductionRunCreate,
    db: AsyncSession = Depends(get_session),
):
    run = await production_run_service.update_run(db, run_id, payload)

    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return production_run_service.enrich_run_dict(run)