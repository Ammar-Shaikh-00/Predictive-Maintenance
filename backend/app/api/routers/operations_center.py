from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_session, get_current_user
from app.models.user import User
from app.services.operations_center_service import (
    build_operations_center_overview,
    clear_operations_center_cache,
)
from app.services import prediction_readiness_service as ml_readiness
from app.services.capability_scorecard_service import build_capability_scorecard

router = APIRouter(prefix="/operations-center", tags=["operations-center"])


class PredictionReadinessUpsert(BaseModel):
    """Payload for AI/ML service to store per-machine Vorhersagebereitschaft."""

    model_config = {"protected_namespaces": ()}

    company_id: str = "default"
    machine_id: str
    readiness_pct: float = Field(..., ge=0, le=100)
    model_id: Optional[str] = None
    model_version: Optional[str] = None
    value_source: str = "AI_SERVICE"
    reported_at: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


@router.get("/overview")
async def operations_center_overview(
    company_id: str = "default",
    machine_id: Optional[str] = Query(
        default=None,
        description="Selected machine from Anlagenübersicht — scopes live values, alarms, maintenance",
    ),
    bootstrap_if_empty: bool = True,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Single aggregated payload for the Operations Center home page.
    Prefer this over multiple frontend polls on the HP Mini PC.
    """
    return await build_operations_center_overview(
        session,
        company_id=company_id,
        machine_id=machine_id,
        bootstrap_if_empty=bootstrap_if_empty,
        use_cache=True,
    )


@router.get("/capability")
async def operations_center_capability(
    company_id: str = "default",
    machine_id: Optional[str] = Query(
        default=None,
        description="Selected machine UUID — scopes live probes where possible",
    ),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Runtime capability scorecard from Docs/capability_component_catalog.json."""
    return await build_capability_scorecard(
        session,
        company_id=company_id,
        machine_id=machine_id,
    )


@router.get("/ai-snapshot")
async def operations_center_ai_snapshot(
    machine_id: Optional[str] = Query(
        default=None,
        description="Optional machine UUID to scope latest live_run_evaluation",
    ),
    history_limit: int = Query(20, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Aggregated Live AI feed for Modules 7 / 15 / 16.
    Built from GET-equivalent live_run / feature / window rows — no invented scores.
    """
    from app.services import ai_findings_service as ai_findings

    return await ai_findings.build_ai_snapshot(
        session, machine_id=machine_id, history_limit=history_limit
    )


@router.put("/prediction-readiness")
async def upsert_prediction_readiness(
    body: PredictionReadinessUpsert,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    AI/ML writes Vorhersagebereitschaft for a machine.
    Operations Center only displays this value — it is never formula-computed here.
    """
    row = await ml_readiness.upsert_machine_prediction_readiness(
        session,
        company_id=body.company_id,
        machine_id=body.machine_id,
        readiness_pct=body.readiness_pct,
        model_id=body.model_id,
        model_version=body.model_version,
        value_source=body.value_source,
        reported_at=body.reported_at,
        details=body.details,
    )
    await session.commit()
    clear_operations_center_cache()
    return {
        "ok": True,
        "company_id": row.company_id,
        "machine_id": row.machine_id,
        "readiness_pct": row.readiness_pct,
        "model_id": row.model_id,
        "model_version": row.model_version,
        "value_source": row.value_source,
        "reported_at": row.reported_at,
    }


@router.get("/prediction-readiness")
async def list_prediction_readiness(
    company_id: str = "default",
    machine_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if machine_id:
        snap = await ml_readiness.get_machine_prediction_readiness(
            session, company_id=company_id, machine_id=machine_id
        )
        return snap or ml_readiness.unavailable_snapshot(machine_id)
    rows = await ml_readiness.list_machine_prediction_readiness(
        session, company_id=company_id
    )
    return {"company_id": company_id, "machines": rows}
