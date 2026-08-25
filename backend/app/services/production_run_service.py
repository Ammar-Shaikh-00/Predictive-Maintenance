from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.machine import Machine
from app.models.production_run import ProductionRun
from app.services.machine_identity import resolve_machine_uuid as _resolve_from_db


async def _resolve_machine_uuid(db: AsyncSession, machine_id: str) -> Optional[UUID]:
    """Resolve UI/API machine token to `machine.id` from Postgres."""
    return await _resolve_from_db(db, machine_id)


def _elapsed_minutes(start_time) -> Optional[float]:
    if not start_time:
        return None
    start = start_time
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return round(max(0.0, (now - start).total_seconds() / 60.0), 1)


def _derived_progress(target_qty, actual_qty, progress_pct) -> Optional[float]:
    if progress_pct is not None:
        try:
            return round(float(progress_pct), 1)
        except (TypeError, ValueError):
            pass
    try:
        t = float(target_qty) if target_qty is not None else None
        a = float(actual_qty) if actual_qty is not None else None
        if t and t > 0 and a is not None:
            return round(min(100.0, max(0.0, (a / t) * 100.0)), 1)
    except (TypeError, ValueError):
        return None
    return None


def enrich_run_dict(run: ProductionRun) -> Dict[str, Any]:
    return {
        "id": run.id,
        "line_id": run.line_id,
        "machine_id": run.machine_id,
        "product_name": run.product_name,
        "product_code": run.product_code,
        "material_name": run.material_name,
        "material_type": run.material_type,
        "material_grade": run.material_grade,
        "supplier": run.supplier,
        "customer_order": run.customer_order,
        "batch_no": run.batch_no,
        "silo_path": run.silo_path,
        "start_time": run.start_time,
        "end_time": run.end_time,
        "status": run.status,
        "tool_name": getattr(run, "tool_name", None),
        "target_qty": getattr(run, "target_qty", None),
        "actual_qty": getattr(run, "actual_qty", None),
        "progress_pct": getattr(run, "progress_pct", None),
        "eta_at": getattr(run, "eta_at", None),
        "elapsed_minutes": _elapsed_minutes(run.start_time),
        "derived_progress_pct": _derived_progress(
            getattr(run, "target_qty", None),
            getattr(run, "actual_qty", None),
            getattr(run, "progress_pct", None),
        ),
    }


def build_order_fields(run: Optional[ProductionRun], machine_name: Optional[str]) -> Dict[str, Any]:
    """Module 8 field board with provenance — never invent ML ETA/progress."""

    def cell(value, source: str, missing_hint: str = "Noch nicht verbunden"):
        has = value is not None and value != ""
        return {
            "value": value if has else None,
            "display": value if has else "—",
            "value_source": source if has else "MANUAL",
            "available": has,
            "hint": None if has else missing_hint,
        }

    if not run:
        return {}

    progress = _derived_progress(
        getattr(run, "target_qty", None),
        getattr(run, "actual_qty", None),
        getattr(run, "progress_pct", None),
    )
    progress_source = "LIVE" if getattr(run, "progress_pct", None) is not None else (
        "DERIVED" if progress is not None else "MANUAL"
    )
    eta = getattr(run, "eta_at", None)

    return {
        "material": cell(run.material_name or run.material_type, "LIVE", "Material im Lauf nicht gesetzt"),
        "customer": cell(run.customer_order, "LIVE", "Kundenauftrag nicht gesetzt"),
        "tool": cell(getattr(run, "tool_name", None), "LIVE", "Werkzeug / Form nicht verbunden"),
        "machine": cell(machine_name or (str(run.machine_id) if run.machine_id else None), "LIVE"),
        "product": cell(run.product_name or run.product_code, "LIVE", "Produkt nicht gesetzt"),
        "batch": cell(run.batch_no, "LIVE", "Charge nicht gesetzt"),
        "status": cell(run.status, "LIVE"),
        "target": cell(getattr(run, "target_qty", None), "LIVE", "Sollmenge nicht verbunden (ERP/MES)"),
        "actual": cell(getattr(run, "actual_qty", None), "LIVE", "Istmenge nicht verbunden"),
        "progress": cell(progress, progress_source, "Fortschritt benötigt Soll- und Istmenge."),
        "eta": cell(
            eta.isoformat() if eta else None,
            "LIVE",
            "ETA nicht verbunden",
        ),
        "elapsed": cell(_elapsed_minutes(run.start_time), "DERIVED"),
        "started": cell(
            run.start_time.isoformat() if run.start_time else None,
            "LIVE",
        ),
    }


async def create_run(db: AsyncSession, data):
    existing_run = await db.execute(
        select(ProductionRun).where(
            ProductionRun.machine_id == data.machine_id,
            ProductionRun.status == "RUNNING",
        )
    )
    running_production = existing_run.scalars().first()
    if running_production:
        raise HTTPException(
            status_code=400,
            detail="This machine already has a running production run.",
        )

    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    run = ProductionRun(**payload)
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def get_run(db: AsyncSession, run_id: int):
    result = await db.execute(select(ProductionRun).where(ProductionRun.id == run_id))
    return result.scalar_one_or_none()


async def get_all_runs(db: AsyncSession, limit: int):
    result = await db.execute(
        select(ProductionRun).order_by(ProductionRun.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


async def update_run(db, run_id: int, data):
    result = await db.execute(select(ProductionRun).where(ProductionRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        return None

    payload = (
        data.model_dump(exclude_unset=True)
        if hasattr(data, "model_dump")
        else data.dict(exclude_unset=True)
    )
    for key, value in payload.items():
        setattr(run, key, value)

    await db.commit()
    await db.refresh(run)
    return run


async def get_current_running_run(db, machine_id: UUID, line_id: int):
    result = await db.execute(
        select(ProductionRun)
        .where(
            ProductionRun.machine_id == machine_id,
            ProductionRun.line_id == line_id,
            ProductionRun.status == "RUNNING",
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_running_run(db: AsyncSession):
    result = await db.execute(
        select(ProductionRun)
        .where(ProductionRun.status == "RUNNING")
        .order_by(ProductionRun.start_time.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_running_run_for_machine(db, machine_id: Any):
    mid = await _resolve_machine_uuid(db, str(machine_id)) if machine_id else None
    if mid is None:
        return None
    result = await db.execute(
        select(ProductionRun)
        .where(
            ProductionRun.status == "RUNNING",
            ProductionRun.machine_id == mid,
        )
        .order_by(ProductionRun.start_time.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def build_current_order_board(
    db: AsyncSession,
    *,
    run_id: Optional[int] = None,
    machine_id: Optional[str] = None,
) -> Dict[str, Any]:
    run = None
    if run_id:
        run = await get_run(db, run_id)
    resolved_machine_id: Optional[UUID] = None
    if machine_id:
        resolved_machine_id = await _resolve_machine_uuid(db, machine_id)
        if resolved_machine_id is None:
            return {
                "run": None,
                "machine_name": None,
                "fields": {},
                "empty": True,
                "message": (
                    f"Maschinen-ID „{machine_id}“ konnte nicht aufgelöst werden "
                    "(UUID oder bekannter Extruder-Name erforderlich)"
                ),
            }

    if not run and resolved_machine_id:
        run = await get_latest_running_run_for_machine(db, str(resolved_machine_id))
        if not run:
            result = await db.execute(
                select(ProductionRun)
                .where(ProductionRun.machine_id == resolved_machine_id)
                .order_by(ProductionRun.start_time.desc())
                .limit(1)
            )
            run = result.scalar_one_or_none()
    if not run:
        run = await get_latest_running_run(db)
    if not run:
        runs = await get_all_runs(db, limit=1)
        run = runs[0] if runs else None

    if not run:
        return {
            "run": None,
            "machine_name": None,
            "fields": {},
            "empty": True,
            "message": "Kein Produktionslauf gefunden — Lauf anlegen oder MES/ERP-Auftragsdaten verbinden",
        }

    # If a machine was requested but the fallback run belongs to another machine, stay honest
    if resolved_machine_id and run.machine_id and run.machine_id != resolved_machine_id:
        return {
            "run": None,
            "machine_name": None,
            "fields": {},
            "empty": True,
            "message": "Kein Produktionslauf für die ausgewählte Maschine",
        }

    machine_name = None
    if run.machine_id:
        mres = await db.execute(select(Machine).where(Machine.id == run.machine_id))
        machine = mres.scalar_one_or_none()
        machine_name = getattr(machine, "name", None) if machine else None

    return {
        "run": enrich_run_dict(run),
        "machine_name": machine_name,
        "fields": build_order_fields(run, machine_name),
        "empty": False,
        "message": None,
    }
