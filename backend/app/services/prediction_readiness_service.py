"""
Per-machine Vorhersagebereitschaft — written by AI/ML, read by Operations Center.

Backend must not invent this from digitalization / source-connection weights.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operations_hardening import MachinePredictionReadiness


from app.core.config import get_settings

settings = get_settings()


def _clamp_pct(value: float) -> float:
    return max(0.0, min(100.0, float(value)))


async def fetch_readiness_from_ai_service(
    machine_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Live pull from AI/ML service when it exposes readiness for a machine.
    Returns None if the endpoint is unavailable or has no score yet.
    """
    import httpx

    mid = str(machine_id).strip()
    if not mid:
        return None
    candidates = [
        f"{settings.ai_service_url.rstrip('/')}/readiness/{mid}",
        f"{settings.ai_service_url.rstrip('/')}/machines/{mid}/readiness",
        f"{settings.ai_service_url.rstrip('/')}/prediction-readiness?machine_id={mid}",
    ]
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            for url in candidates:
                try:
                    response = await client.get(url)
                except Exception:  # noqa: BLE001
                    continue
                if response.status_code != 200:
                    continue
                data = response.json()
                pct = (
                    data.get("readiness_pct")
                    if data.get("readiness_pct") is not None
                    else data.get("value")
                    if data.get("value") is not None
                    else data.get("prediction_readiness")
                )
                if pct is None:
                    continue
                return {
                    "available": True,
                    "value": round(_clamp_pct(float(pct)), 1),
                    "machine_id": mid,
                    "model_id": data.get("model_id"),
                    "model_version": data.get("model_version"),
                    "value_source": "AI_SERVICE",
                    "reported_at": data.get("reported_at"),
                    "details": dict(data.get("details") or {}),
                    "hint": None,
                }
    except Exception:  # noqa: BLE001
        return None
    return None


async def resolve_machine_prediction_readiness(
    session: AsyncSession,
    *,
    company_id: str,
    machine_id: Optional[str],
) -> Dict[str, Any]:
    """
    Authoritative readiness for OC: AI/ML live endpoint first, then stored ML row.
    Never invent from digitalization / source weights.
    """
    if not machine_id:
        return unavailable_snapshot(None)

    live = await fetch_readiness_from_ai_service(str(machine_id))
    if live is not None:
        return live

    try:
        stored = await get_machine_prediction_readiness(
            session, company_id=company_id, machine_id=machine_id
        )
    except Exception:  # noqa: BLE001
        stored = None

    if stored is not None and stored.get("available"):
        return stored

    return unavailable_snapshot(machine_id)


async def get_machine_prediction_readiness(
    session: AsyncSession,
    *,
    company_id: str,
    machine_id: Optional[str],
) -> Optional[Dict[str, Any]]:
    if not machine_id:
        return None
    result = await session.execute(
        select(MachinePredictionReadiness).where(
            MachinePredictionReadiness.company_id == company_id,
            MachinePredictionReadiness.machine_id == str(machine_id),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        # Case-insensitive fallback for id variants
        result = await session.execute(
            select(MachinePredictionReadiness).where(
                MachinePredictionReadiness.company_id == company_id
            )
        )
        rows = list(result.scalars().all())
        mid = str(machine_id).strip().lower().replace("-", "")
        row = next(
            (
                r
                for r in rows
                if str(r.machine_id).strip().lower().replace("-", "") == mid
            ),
            None,
        )
    if row is None:
        return None
    return {
        "available": True,
        "value": round(_clamp_pct(row.readiness_pct), 1),
        "machine_id": row.machine_id,
        "model_id": row.model_id,
        "model_version": row.model_version,
        "value_source": row.value_source or "AI_SERVICE",
        "reported_at": row.reported_at,
        "details": dict(row.details_json or {}),
        "hint": None,
    }


async def get_company_prediction_readiness_average(
    session: AsyncSession,
    *,
    company_id: str,
) -> Optional[float]:
    result = await session.execute(
        select(MachinePredictionReadiness).where(
            MachinePredictionReadiness.company_id == company_id
        )
    )
    rows = list(result.scalars().all())
    if not rows:
        return None
    return round(sum(_clamp_pct(r.readiness_pct) for r in rows) / len(rows), 1)


async def upsert_machine_prediction_readiness(
    session: AsyncSession,
    *,
    company_id: str,
    machine_id: str,
    readiness_pct: float,
    model_id: Optional[str] = None,
    model_version: Optional[str] = None,
    value_source: str = "AI_SERVICE",
    reported_at: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> MachinePredictionReadiness:
    mid = str(machine_id).strip()
    result = await session.execute(
        select(MachinePredictionReadiness).where(
            MachinePredictionReadiness.company_id == company_id,
            MachinePredictionReadiness.machine_id == mid,
        )
    )
    row = result.scalar_one_or_none()
    now_iso = reported_at or (datetime.now(timezone.utc).isoformat())
    if row is None:
        row = MachinePredictionReadiness(
            company_id=company_id,
            machine_id=mid,
            readiness_pct=_clamp_pct(readiness_pct),
            model_id=model_id,
            model_version=model_version,
            value_source=value_source or "AI_SERVICE",
            reported_at=now_iso,
            details_json=details or {},
        )
        session.add(row)
    else:
        row.readiness_pct = _clamp_pct(readiness_pct)
        row.model_id = model_id
        row.model_version = model_version
        row.value_source = value_source or "AI_SERVICE"
        row.reported_at = now_iso
        row.details_json = details or {}
    await session.flush()
    return row


async def list_machine_prediction_readiness(
    session: AsyncSession,
    *,
    company_id: str,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(MachinePredictionReadiness).where(
            MachinePredictionReadiness.company_id == company_id
        )
    )
    return [
        {
            "machine_id": r.machine_id,
            "readiness_pct": round(_clamp_pct(r.readiness_pct), 1),
            "model_id": r.model_id,
            "model_version": r.model_version,
            "value_source": r.value_source,
            "reported_at": r.reported_at,
            "details": dict(r.details_json or {}),
        }
        for r in result.scalars().all()
    ]


def unavailable_snapshot(machine_id: Optional[str] = None) -> Dict[str, Any]:
    name = machine_id or "diese Maschine"
    return {
        "available": False,
        "value": None,
        "machine_id": machine_id,
        "model_id": None,
        "model_version": None,
        "value_source": "AI_SERVICE",
        "reported_at": None,
        "details": {},
        "hint": (
            f"Vorhersagebereitschaft für {name} kommt vom AI/ML-Dienst — "
            "noch kein Score gemeldet."
        ),
    }
