"""
Retrain / history export APIs for Ammar's live_monitor Postgres-only cutover.

Ingest POSTs stay on existing routers. These GETs provide time-range + machine
filters with paginated envelopes so SQLite is not required for retrain history.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.live_feature_evaluation import LiveFeatureEvaluation
from app.models.live_process_window import LiveProcessWindow
from app.models.live_run_evaluation import LiveRunEvaluation
from app.models.machine_sensor_raw import MachineSensorRaw
from app.schemas.live_feature_evaluation import LiveFeatureEvaluationRead
from app.schemas.live_process_window import LiveProcessWindowRead
from app.schemas.live_run_evaluation import LiveRunEvaluationRead
from app.services.live_export_service import (
    LiveExportPage,
    fetch_page,
    parse_uuid,
    to_utc_naive,
)

router = APIRouter(prefix="/live-ml-export", tags=["Live ML Export (retrain)"])


def _window_time_filters(query, date_from: Optional[datetime], date_to: Optional[datetime]):
    start = to_utc_naive(date_from)
    end = to_utc_naive(date_to)
    if start is not None:
        query = query.where(LiveProcessWindow.window_end >= start)
    if end is not None:
        query = query.where(LiveProcessWindow.window_start <= end)
    return query


@router.get("/pipeline-status")
async def pipeline_status(
    session: AsyncSession = Depends(get_session),
    machine_id: Optional[str] = Query(
        None, description="Optional machine UUID to scope counts"
    ),
) -> Dict[str, Any]:
    """
    Confirm live_monitor → Postgres data flow (P0 verify).
    Returns table counts + latest window/eval timestamps.
    """
    mid: Optional[UUID] = None
    if machine_id:
        try:
            mid = parse_uuid(machine_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid machine_id: {exc}") from exc

    windows_q = select(func.count()).select_from(LiveProcessWindow)
    runs_q = select(func.count()).select_from(LiveRunEvaluation)
    feats_q = select(func.count()).select_from(LiveFeatureEvaluation)
    raw_q = select(func.count()).select_from(MachineSensorRaw)

    if mid is not None:
        windows_q = windows_q.where(LiveProcessWindow.machine_id == mid)
        runs_q = runs_q.where(LiveRunEvaluation.machine_id == mid)
        raw_q = raw_q.where(MachineSensorRaw.machine_id == mid)
        feats_q = (
            select(func.count())
            .select_from(LiveFeatureEvaluation)
            .join(
                LiveProcessWindow,
                LiveFeatureEvaluation.live_process_window_id == LiveProcessWindow.id,
            )
            .where(LiveProcessWindow.machine_id == mid)
        )

    windows = int((await session.execute(windows_q)).scalar_one() or 0)
    runs = int((await session.execute(runs_q)).scalar_one() or 0)
    feats = int((await session.execute(feats_q)).scalar_one() or 0)
    raw = int((await session.execute(raw_q)).scalar_one() or 0)

    latest_window_q = select(LiveProcessWindow).order_by(
        LiveProcessWindow.window_end.desc()
    )
    if mid is not None:
        latest_window_q = latest_window_q.where(LiveProcessWindow.machine_id == mid)
    latest_window = (
        await session.execute(latest_window_q.limit(1))
    ).scalar_one_or_none()

    latest_run_q = select(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc())
    if mid is not None:
        latest_run_q = latest_run_q.where(LiveRunEvaluation.machine_id == mid)
    latest_run = (await session.execute(latest_run_q.limit(1))).scalar_one_or_none()

    flowing = windows > 0 and runs > 0
    return {
        "ok": True,
        "machine_id": str(mid) if mid else None,
        "counts": {
            "machine_sensor_raw": raw,
            "live_process_windows": windows,
            "live_run_evaluations": runs,
            "live_feature_evaluations": feats,
        },
        "latest_window": {
            "id": latest_window.id if latest_window else None,
            "window_start": latest_window.window_start.isoformat() if latest_window and latest_window.window_start else None,
            "window_end": latest_window.window_end.isoformat() if latest_window and latest_window.window_end else None,
            "confirmed_state": latest_window.confirmed_state if latest_window else None,
            "machine_id": str(latest_window.machine_id) if latest_window and latest_window.machine_id else None,
        }
        if latest_window
        else None,
        "latest_run_evaluation": {
            "id": latest_run.id if latest_run else None,
            "overall_status": latest_run.overall_status if latest_run else None,
            "ml_anomaly_score": latest_run.ml_anomaly_score if latest_run else None,
            "ml_is_anomaly": latest_run.ml_is_anomaly if latest_run else None,
            "ml_model_status": latest_run.ml_model_status if latest_run else None,
            "explanation_text": latest_run.explanation_text if latest_run else None,
        }
        if latest_run
        else None,
        "data_flowing": flowing,
        "hint": (
            "live_monitor → Postgres OK"
            if flowing
            else "No windows/run-evals yet — confirm live_monitor BackendWriter is posting"
        ),
        "ingest_endpoints": [
            "POST /machine-raw-data/",
            "POST /live-process-windows",
            "POST /live-run-evaluations",
            "POST /live-feature-evaluations",
        ],
        "export_endpoints": [
            "GET /live-ml-export/windows",
            "GET /live-ml-export/run-evaluations",
            "GET /live-ml-export/feature-evaluations",
            "GET /machine-raw-data/?machine_id&line_id&datefrom&dateTo",
        ],
        "accuracy_note": (
            "Module 5 (validated Accuracy) is locked until model_versions exists. "
            "UI shows Prediction Readiness from AI/ML only — never invent Accuracy %."
        ),
    }


@router.get("/windows", response_model=LiveExportPage)
async def export_windows(
    session: AsyncSession = Depends(get_session),
    machine_id: Optional[str] = Query(None),
    production_run_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(
        None, description="Include windows overlapping from this UTC time"
    ),
    date_to: Optional[datetime] = Query(
        None, description="Include windows overlapping until this UTC time"
    ),
    confirmed_state: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
) -> LiveExportPage:
    """Historical process windows for retrain / offline evaluation."""
    mid = None
    if machine_id:
        try:
            mid = parse_uuid(machine_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid machine_id: {exc}") from exc

    query = select(LiveProcessWindow)
    if mid is not None:
        query = query.where(LiveProcessWindow.machine_id == mid)
    if production_run_id is not None:
        query = query.where(LiveProcessWindow.production_run_id == production_run_id)
    if confirmed_state:
        query = query.where(LiveProcessWindow.confirmed_state == confirmed_state.strip().upper())
    query = _window_time_filters(query, date_from, date_to)
    order = (
        LiveProcessWindow.window_start.asc()
        if sort == "asc"
        else LiveProcessWindow.window_start.desc()
    )
    query = query.order_by(order)

    rows, has_more = await fetch_page(session, query, limit=limit, offset=offset)
    return LiveExportPage(
        items=[LiveProcessWindowRead.model_validate(r).model_dump(mode="json") for r in rows],
        limit=limit,
        offset=offset,
        has_more=has_more,
        machine_id=mid,
        date_from=to_utc_naive(date_from),
        date_to=to_utc_naive(date_to),
    )


@router.get("/run-evaluations", response_model=LiveExportPage)
async def export_run_evaluations(
    session: AsyncSession = Depends(get_session),
    machine_id: Optional[str] = Query(None),
    production_run_id: Optional[int] = Query(None),
    live_process_window_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(
        None, description="Filter by linked window_end >= date_from"
    ),
    date_to: Optional[datetime] = Query(
        None, description="Filter by linked window_start <= date_to"
    ),
    ml_is_anomaly: Optional[bool] = Query(None),
    ml_model_status: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
) -> LiveExportPage:
    """Historical run evaluations (anomaly / drift / status) for retrain."""
    mid = None
    if machine_id:
        try:
            mid = parse_uuid(machine_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid machine_id: {exc}") from exc

    need_join = date_from is not None or date_to is not None
    if need_join:
        query = select(LiveRunEvaluation).join(
            LiveProcessWindow,
            LiveRunEvaluation.live_process_window_id == LiveProcessWindow.id,
            isouter=True,
        )
        query = _window_time_filters(query, date_from, date_to)
    else:
        query = select(LiveRunEvaluation)

    if mid is not None:
        query = query.where(LiveRunEvaluation.machine_id == mid)
    if production_run_id is not None:
        query = query.where(LiveRunEvaluation.production_run_id == production_run_id)
    if live_process_window_id is not None:
        query = query.where(
            LiveRunEvaluation.live_process_window_id == live_process_window_id
        )
    if ml_is_anomaly is not None:
        query = query.where(LiveRunEvaluation.ml_is_anomaly.is_(ml_is_anomaly))
    if ml_model_status:
        query = query.where(
            LiveRunEvaluation.ml_model_status == ml_model_status.strip().upper()
        )

    order = (
        LiveRunEvaluation.id.asc() if sort == "asc" else LiveRunEvaluation.id.desc()
    )
    query = query.order_by(order)

    rows, has_more = await fetch_page(session, query, limit=limit, offset=offset)
    return LiveExportPage(
        items=[LiveRunEvaluationRead.model_validate(r).model_dump(mode="json") for r in rows],
        limit=limit,
        offset=offset,
        has_more=has_more,
        machine_id=mid,
        date_from=to_utc_naive(date_from),
        date_to=to_utc_naive(date_to),
    )


@router.get("/feature-evaluations", response_model=LiveExportPage)
async def export_feature_evaluations(
    session: AsyncSession = Depends(get_session),
    machine_id: Optional[str] = Query(None),
    live_process_window_id: Optional[int] = Query(None),
    live_run_evaluation_id: Optional[int] = Query(None),
    feature_name: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(1000, ge=1, le=10_000),
    offset: int = Query(0, ge=0),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
) -> LiveExportPage:
    """Per-feature z-score / baseline evaluations for retrain & Module 14 enrich."""
    mid = None
    if machine_id:
        try:
            mid = parse_uuid(machine_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid machine_id: {exc}") from exc

    need_join = mid is not None or date_from is not None or date_to is not None
    if need_join:
        query = select(LiveFeatureEvaluation).join(
            LiveProcessWindow,
            LiveFeatureEvaluation.live_process_window_id == LiveProcessWindow.id,
            isouter=True,
        )
        if mid is not None:
            query = query.where(LiveProcessWindow.machine_id == mid)
        query = _window_time_filters(query, date_from, date_to)
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

    order = (
        LiveFeatureEvaluation.id.asc()
        if sort == "asc"
        else LiveFeatureEvaluation.id.desc()
    )
    query = query.order_by(order)

    rows, has_more = await fetch_page(session, query, limit=limit, offset=offset)
    return LiveExportPage(
        items=[LiveFeatureEvaluationRead.model_validate(r).model_dump(mode="json") for r in rows],
        limit=limit,
        offset=offset,
        has_more=has_more,
        machine_id=mid,
        date_from=to_utc_naive(date_from),
        date_to=to_utc_naive(date_to),
    )
