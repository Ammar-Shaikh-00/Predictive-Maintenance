"""Module 18 — Maintenance Center service (history + planned + wear + RUL display).

Never invents remaining useful life — only surfaces prediction.rul when present.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.imported_domain_events import ImportedMaintenanceEvent
from app.models.machine import Machine
from app.models.maintenance_center import MaintenancePlan, WearPart
from app.models.prediction import Prediction
from app.schemas.maintenance_center import (
    MaintenancePlanCreate,
    MaintenancePlanUpdate,
    WearPartCreate,
    WearPartUpdate,
)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.isoformat()


def _plan_dict(row: MaintenancePlan) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "company_id": row.company_id,
        "machine_id": row.machine_id,
        "title": row.title,
        "component": row.component,
        "planned_at": _iso(row.planned_at),
        "status": row.status,
        "technician": row.technician,
        "notes": row.notes,
        "value_source": row.value_source or "MANUAL",
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _wear_dict(row: WearPart) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "company_id": row.company_id,
        "machine_id": row.machine_id,
        "name": row.name,
        "part_number": row.part_number,
        "component": row.component,
        "installed_at": _iso(row.installed_at),
        "next_replace_at": _iso(row.next_replace_at),
        "quantity_on_hand": row.quantity_on_hand,
        "notes": row.notes,
        "value_source": row.value_source or "MANUAL",
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _history_dict(row: ImportedMaintenanceEvent) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "company_id": row.company_id,
        "import_batch_id": row.import_batch_id,
        "machine_id": row.machine_id,
        "event_at": row.event_at,
        "work_order": row.work_order,
        "component": row.component,
        "action": row.action,
        "technician": row.technician,
        "payload": dict(row.payload_json or {}),
        "created_at": _iso(row.created_at),
        "value_source": "LIVE",
    }


async def list_plans(
    session: AsyncSession, *, company_id: str = "default", limit: int = 200
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 200), 500))
    result = await session.execute(
        select(MaintenancePlan)
        .where(MaintenancePlan.company_id == company_id)
        .order_by(MaintenancePlan.planned_at.asc().nulls_last(), MaintenancePlan.created_at.desc())
        .limit(limit)
    )
    return [_plan_dict(r) for r in result.scalars().all()]


async def create_plan(
    session: AsyncSession, payload: MaintenancePlanCreate
) -> Dict[str, Any]:
    row = MaintenancePlan(**payload.model_dump())
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _plan_dict(row)


async def update_plan(
    session: AsyncSession, plan_id: UUID, payload: MaintenancePlanUpdate
) -> Optional[Dict[str, Any]]:
    row = await session.get(MaintenancePlan, plan_id)
    if not row:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await session.commit()
    await session.refresh(row)
    return _plan_dict(row)


async def delete_plan(session: AsyncSession, plan_id: UUID) -> bool:
    row = await session.get(MaintenancePlan, plan_id)
    if not row:
        return False
    await session.delete(row)
    await session.commit()
    return True


async def list_wear_parts(
    session: AsyncSession, *, company_id: str = "default", limit: int = 200
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 200), 500))
    result = await session.execute(
        select(WearPart)
        .where(WearPart.company_id == company_id)
        .order_by(WearPart.next_replace_at.asc().nulls_last(), WearPart.name.asc())
        .limit(limit)
    )
    return [_wear_dict(r) for r in result.scalars().all()]


async def create_wear_part(
    session: AsyncSession, payload: WearPartCreate
) -> Dict[str, Any]:
    row = WearPart(**payload.model_dump())
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _wear_dict(row)


async def update_wear_part(
    session: AsyncSession, part_id: UUID, payload: WearPartUpdate
) -> Optional[Dict[str, Any]]:
    row = await session.get(WearPart, part_id)
    if not row:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await session.commit()
    await session.refresh(row)
    return _wear_dict(row)


async def delete_wear_part(session: AsyncSession, part_id: UUID) -> bool:
    row = await session.get(WearPart, part_id)
    if not row:
        return False
    await session.delete(row)
    await session.commit()
    return True


async def list_history(
    session: AsyncSession, *, company_id: str = "default", limit: int = 200
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 200), 500))
    result = await session.execute(
        select(ImportedMaintenanceEvent)
        .where(ImportedMaintenanceEvent.company_id == company_id)
        .order_by(ImportedMaintenanceEvent.created_at.desc())
        .limit(limit)
    )
    return [_history_dict(r) for r in result.scalars().all()]


async def remaining_life_by_machine(session: AsyncSession) -> List[Dict[str, Any]]:
    """Latest prediction RUL per machine — null/unavailable when no real RUL."""
    machines = (
        await session.execute(select(Machine).order_by(Machine.name.asc()))
    ).scalars().all()

    preds = (
        await session.execute(
            select(Prediction).order_by(Prediction.timestamp.desc()).limit(500)
        )
    ).scalars().all()

    latest: Dict[str, Prediction] = {}
    for p in preds:
        mid = str(p.machine_id)
        if mid not in latest:
            latest[mid] = p

    out: List[Dict[str, Any]] = []
    for m in machines:
        mid = str(m.id)
        p = latest.get(mid)
        rul = int(p.rul) if p is not None and p.rul is not None else None
        out.append(
            {
                "machine_id": mid,
                "machine_name": m.name or mid,
                "remaining_useful_life": rul,
                "prediction_id": str(p.id) if p and rul is not None else None,
                "timestamp": _iso(p.timestamp) if p and rul is not None else None,
                "value_source": "MODEL_PREDICTION" if rul is not None else "MANUAL",
                "available": rul is not None,
            }
        )
    return out


def build_calendar_events(
    *,
    history: List[Dict[str, Any]],
    plans: List[Dict[str, Any]],
    wear_parts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Merge history / planned / wear replace dates into calendar entries."""
    events: List[Dict[str, Any]] = []

    for h in history:
        when = h.get("event_at") or h.get("created_at")
        if not when:
            continue
        events.append(
            {
                "id": f"hist-{h.get('id')}",
                "date": str(when)[:10],
                "kind": "history",
                "title": h.get("action") or h.get("work_order") or "Maintenance",
                "machine_id": h.get("machine_id"),
                "status": "done",
                "value_source": h.get("value_source") or "LIVE",
            }
        )

    for p in plans:
        when = p.get("planned_at")
        if not when:
            continue
        events.append(
            {
                "id": f"plan-{p.get('id')}",
                "date": str(when)[:10],
                "kind": "planned",
                "title": p.get("title") or "Planned",
                "machine_id": p.get("machine_id"),
                "status": p.get("status") or "planned",
                "value_source": p.get("value_source") or "MANUAL",
            }
        )

    for w in wear_parts:
        when = w.get("next_replace_at")
        if not when:
            continue
        events.append(
            {
                "id": f"wear-{w.get('id')}",
                "date": str(when)[:10],
                "kind": "wear",
                "title": f"Replace {w.get('name') or 'part'}",
                "machine_id": w.get("machine_id"),
                "status": "due",
                "value_source": w.get("value_source") or "MANUAL",
            }
        )

    events.sort(key=lambda e: e.get("date") or "")
    return events


async def get_overview(
    session: AsyncSession, *, company_id: str = "default"
) -> Dict[str, Any]:
    history = await list_history(session, company_id=company_id, limit=200)
    plans = await list_plans(session, company_id=company_id, limit=200)
    wear_parts = await list_wear_parts(session, company_id=company_id, limit=200)
    remaining_life = await remaining_life_by_machine(session)
    calendar = build_calendar_events(
        history=history, plans=plans, wear_parts=wear_parts
    )

    open_plans = [
        p
        for p in plans
        if str(p.get("status") or "").lower() in {"planned", "in_progress"}
    ]
    rul_known = sum(1 for r in remaining_life if r.get("available"))

    return {
        "company_id": company_id,
        "kpis": {
            "history_count": len(history),
            "planned_open": len(open_plans),
            "wear_parts": len(wear_parts),
            "rul_available": rul_known,
            "machines": len(remaining_life),
        },
        "remaining_life": remaining_life,
        "history": history,
        "planned": plans,
        "wear_parts": wear_parts,
        "calendar": calendar,
    }
