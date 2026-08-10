"""Promote setup-wizard connector rows into operational domain event tables.

No AI/ML — quality / maintenance / material / energy / operator sinks only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.imported_domain_events import (
    ImportedEnergyReading,
    ImportedMaintenanceEvent,
    ImportedMaterialBatch,
    ImportedOperatorEvent,
    ImportedQualityEvent,
)
from app.models.production_run import ProductionRun
from app.models.quality_record import QualityRecord
from app.services.data_connectors.common import extract_row_meta


def _as_float(val: Any) -> Optional[float]:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _as_str(val: Any, *, max_len: int = 255) -> Optional[str]:
    if val is None:
        return None
    text = str(val).strip()
    if not text:
        return None
    return text[:max_len]


def _parse_run_id(val: Any) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        return int(str(val).strip())
    except (TypeError, ValueError):
        return None


async def _resolve_production_run_id(
    session: AsyncSession,
    external_key: Optional[str],
) -> Optional[int]:
    run_id = _parse_run_id(external_key)
    if run_id is None:
        return None
    result = await session.execute(
        select(ProductionRun.id).where(ProductionRun.id == run_id).limit(1)
    )
    found = result.scalar_one_or_none()
    return int(found) if found is not None else None


async def _best_effort_quality_record(
    session: AsyncSession,
    *,
    production_run_id: int,
    mapped: Dict[str, Any],
) -> bool:
    """Upsert QualityRecord without committing (caller owns the transaction)."""
    result = await session.execute(
        select(QualityRecord).where(QualityRecord.production_run_id == production_run_id)
    )
    quality = result.scalar_one_or_none()
    status = _as_str(mapped.get("approval_status"), max_len=64)
    scrap = _as_float(mapped.get("scrap"))
    qv = _as_float(mapped.get("quality_value"))
    notes_parts = []
    if qv is not None:
        notes_parts.append(f"imported_quality_value={qv}")
    if mapped.get("material_batch"):
        notes_parts.append(f"material_batch={mapped.get('material_batch')}")
    notes = "; ".join(notes_parts) or None

    if quality:
        if status is not None:
            quality.quality_status = status
        if scrap is not None:
            quality.scrap_amount = scrap
        if notes:
            quality.notes = notes
        return True

    session.add(
        QualityRecord(
            production_run_id=production_run_id,
            quality_status=status,
            scrap_amount=scrap,
            notes=notes,
            internal_qc_result=_as_str(mapped.get("quality_value"), max_len=64),
        )
    )
    return True


async def promote_quality_rows(
    session: AsyncSession,
    *,
    company_id: str,
    import_batch_id: str,
    rows: Sequence[Dict[str, Any]],
) -> Dict[str, int]:
    promoted = 0
    linked_runs = 0
    for mapped in rows:
        ts_str, machine_id = extract_row_meta(mapped)
        external = _as_str(
            mapped.get("production_run") or mapped.get("production_run_id"),
            max_len=128,
        )
        production_run_id = await _resolve_production_run_id(session, external)
        promoted_flag = "no"
        if production_run_id is not None:
            ok = await _best_effort_quality_record(
                session, production_run_id=production_run_id, mapped=mapped
            )
            if ok:
                promoted_flag = "yes"
                linked_runs += 1

        session.add(
            ImportedQualityEvent(
                company_id=company_id,
                import_batch_id=import_batch_id,
                machine_id=machine_id or _as_str(mapped.get("machine_id"), max_len=128),
                event_at=ts_str,
                external_run_key=external,
                production_run_id=production_run_id,
                material_batch=_as_str(mapped.get("material_batch"), max_len=128),
                quality_value=_as_float(mapped.get("quality_value")),
                approval_status=_as_str(mapped.get("approval_status"), max_len=64),
                scrap=_as_float(mapped.get("scrap")),
                notes=None,
                payload_json=dict(mapped),
                promoted_to_quality_record=promoted_flag,
            )
        )
        promoted += 1
    return {"domain_rows": promoted, "quality_records_linked": linked_runs}


async def promote_maintenance_rows(
    session: AsyncSession,
    *,
    company_id: str,
    import_batch_id: str,
    rows: Sequence[Dict[str, Any]],
) -> Dict[str, int]:
    count = 0
    for mapped in rows:
        ts_str, machine_id = extract_row_meta(mapped)
        session.add(
            ImportedMaintenanceEvent(
                company_id=company_id,
                import_batch_id=import_batch_id,
                machine_id=machine_id or _as_str(mapped.get("machine_id"), max_len=128),
                event_at=ts_str,
                work_order=_as_str(mapped.get("work_order"), max_len=128),
                component=_as_str(mapped.get("component"), max_len=160),
                action=_as_str(mapped.get("action"), max_len=160),
                technician=_as_str(mapped.get("technician"), max_len=160),
                payload_json=dict(mapped),
            )
        )
        count += 1
    return {"domain_rows": count}


async def promote_material_rows(
    session: AsyncSession,
    *,
    company_id: str,
    import_batch_id: str,
    rows: Sequence[Dict[str, Any]],
) -> Dict[str, int]:
    count = 0
    for mapped in rows:
        ts_str, _machine = extract_row_meta(mapped)
        session.add(
            ImportedMaterialBatch(
                company_id=company_id,
                import_batch_id=import_batch_id,
                material_id=_as_str(mapped.get("material_id"), max_len=128),
                material_batch=_as_str(mapped.get("material_batch"), max_len=128),
                event_at=ts_str,
                supplier=_as_str(mapped.get("supplier"), max_len=160),
                lot_quality=_as_str(mapped.get("lot_quality"), max_len=64),
                payload_json=dict(mapped),
            )
        )
        count += 1
    return {"domain_rows": count}


async def promote_energy_rows(
    session: AsyncSession,
    *,
    company_id: str,
    import_batch_id: str,
    rows: Sequence[Dict[str, Any]],
) -> Dict[str, int]:
    count = 0
    for mapped in rows:
        ts_str, machine_id = extract_row_meta(mapped)
        session.add(
            ImportedEnergyReading(
                company_id=company_id,
                import_batch_id=import_batch_id,
                machine_id=machine_id or _as_str(mapped.get("machine_id"), max_len=128),
                event_at=ts_str,
                kwh=_as_float(mapped.get("kwh")),
                cost=_as_float(mapped.get("cost")),
                payload_json=dict(mapped),
            )
        )
        count += 1
    return {"domain_rows": count}


async def promote_operator_rows(
    session: AsyncSession,
    *,
    company_id: str,
    import_batch_id: str,
    rows: Sequence[Dict[str, Any]],
) -> Dict[str, int]:
    count = 0
    for mapped in rows:
        ts_str, machine_id = extract_row_meta(mapped)
        session.add(
            ImportedOperatorEvent(
                company_id=company_id,
                import_batch_id=import_batch_id,
                machine_id=machine_id or _as_str(mapped.get("machine_id"), max_len=128),
                event_at=ts_str,
                value=_as_str(mapped.get("value"), max_len=255),
                status=_as_str(mapped.get("status"), max_len=64),
                payload_json=dict(mapped),
            )
        )
        count += 1
    return {"domain_rows": count}


async def promote_import_batch_to_domain(
    session: AsyncSession,
    *,
    company_id: str,
    source_key: str,
    import_batch_id: str,
    rows: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    """Dispatch mapped connector rows into the matching domain sink."""
    if not rows:
        return {"source_key": source_key, "domain_table": None, "domain_rows": 0}

    key = (source_key or "").strip().lower()
    if key == "quality_data":
        stats = await promote_quality_rows(
            session, company_id=company_id, import_batch_id=import_batch_id, rows=rows
        )
        return {"source_key": key, "domain_table": "imported_quality_events", **stats}

    if key == "maintenance_history":
        stats = await promote_maintenance_rows(
            session, company_id=company_id, import_batch_id=import_batch_id, rows=rows
        )
        return {"source_key": key, "domain_table": "imported_maintenance_events", **stats}

    if key == "material_batches":
        stats = await promote_material_rows(
            session, company_id=company_id, import_batch_id=import_batch_id, rows=rows
        )
        return {"source_key": key, "domain_table": "imported_material_batches", **stats}

    if key == "energy_data":
        stats = await promote_energy_rows(
            session, company_id=company_id, import_batch_id=import_batch_id, rows=rows
        )
        return {"source_key": key, "domain_table": "imported_energy_readings", **stats}

    if key == "operator_events":
        stats = await promote_operator_rows(
            session, company_id=company_id, import_batch_id=import_batch_id, rows=rows
        )
        return {"source_key": key, "domain_table": "imported_operator_events", **stats}

    return {
        "source_key": key,
        "domain_table": None,
        "domain_rows": 0,
        "skipped_reason": "no_domain_sink_for_source_key",
    }


async def latest_energy_reading(
    session: AsyncSession,
    *,
    company_id: str = "default",
) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(ImportedEnergyReading)
        .where(ImportedEnergyReading.company_id == company_id)
        .order_by(ImportedEnergyReading.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    return {
        "kwh": row.kwh,
        "cost": row.cost,
        "machine_id": row.machine_id,
        "event_at": row.event_at,
        "value_source": "LIVE",
    }


async def list_maintenance_events(
    session: AsyncSession,
    *,
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 100), 500))
    offset = max(0, int(offset or 0))
    result = await session.execute(
        select(ImportedMaintenanceEvent)
        .where(ImportedMaintenanceEvent.company_id == company_id)
        .order_by(ImportedMaintenanceEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = list(result.scalars().all())
    return [
        {
            "id": str(r.id),
            "company_id": r.company_id,
            "import_batch_id": r.import_batch_id,
            "machine_id": r.machine_id,
            "event_at": r.event_at,
            "work_order": r.work_order,
            "component": r.component,
            "action": r.action,
            "technician": r.technician,
            "payload": dict(r.payload_json or {}),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "value_source": "LIVE",
        }
        for r in rows
    ]


async def list_energy_readings(
    session: AsyncSession,
    *,
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 100), 500))
    offset = max(0, int(offset or 0))
    result = await session.execute(
        select(ImportedEnergyReading)
        .where(ImportedEnergyReading.company_id == company_id)
        .order_by(ImportedEnergyReading.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = list(result.scalars().all())
    return [
        {
            "id": str(r.id),
            "company_id": r.company_id,
            "import_batch_id": r.import_batch_id,
            "machine_id": r.machine_id,
            "event_at": r.event_at,
            "kwh": r.kwh,
            "cost": r.cost,
            "payload": dict(r.payload_json or {}),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "value_source": "LIVE",
        }
        for r in rows
    ]


async def list_quality_events(
    session: AsyncSession,
    *,
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 100), 500))
    offset = max(0, int(offset or 0))
    result = await session.execute(
        select(ImportedQualityEvent)
        .where(ImportedQualityEvent.company_id == company_id)
        .order_by(ImportedQualityEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = list(result.scalars().all())
    return [
        {
            "id": str(r.id),
            "company_id": r.company_id,
            "import_batch_id": r.import_batch_id,
            "machine_id": r.machine_id,
            "event_at": r.event_at,
            "external_run_key": r.external_run_key,
            "production_run_id": r.production_run_id,
            "material_batch": r.material_batch,
            "quality_value": r.quality_value,
            "approval_status": r.approval_status,
            "scrap": r.scrap,
            "promoted_to_quality_record": r.promoted_to_quality_record,
            "payload": dict(r.payload_json or {}),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "value_source": "LIVE",
        }
        for r in rows
    ]


async def list_material_batches(
    session: AsyncSession,
    *,
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 100), 500))
    offset = max(0, int(offset or 0))
    result = await session.execute(
        select(ImportedMaterialBatch)
        .where(ImportedMaterialBatch.company_id == company_id)
        .order_by(ImportedMaterialBatch.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = list(result.scalars().all())
    return [
        {
            "id": str(r.id),
            "company_id": r.company_id,
            "import_batch_id": r.import_batch_id,
            "material_id": r.material_id,
            "material_batch": r.material_batch,
            "event_at": r.event_at,
            "supplier": r.supplier,
            "lot_quality": r.lot_quality,
            "payload": dict(r.payload_json or {}),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "value_source": "LIVE",
        }
        for r in rows
    ]


async def domain_import_summary(
    session: AsyncSession,
    *,
    company_id: str = "default",
) -> Dict[str, int]:
    async def _count(model) -> int:
        from sqlalchemy import func

        res = await session.execute(
            select(func.count()).select_from(model).where(model.company_id == company_id)
        )
        return int(res.scalar_one() or 0)

    return {
        "quality_events": await _count(ImportedQualityEvent),
        "maintenance_events": await _count(ImportedMaintenanceEvent),
        "material_batches": await _count(ImportedMaterialBatch),
        "energy_readings": await _count(ImportedEnergyReading),
        "operator_events": await _count(ImportedOperatorEvent),
    }
