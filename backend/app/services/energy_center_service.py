"""Module 19 — Energy Center aggregation.

Consumption / cost from imported readings (LIVE).
CO₂ and gap-filled cost are DERIVED only when configured factors exist.
Savings potential only when a baseline_period_kwh is configured — never invented.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.energy_center import EnergySettings
from app.models.imported_domain_events import ImportedEnergyReading
from app.models.machine import Machine
from app.schemas.energy_center import EnergySettingsUpsert


def _as_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def extract_material_key(payload: Optional[dict], row_fallback: Optional[dict] = None) -> Optional[str]:
    src = dict(payload or {})
    if row_fallback:
        for k in ("material_batch", "material_id", "material"):
            if k not in src and row_fallback.get(k) is not None:
                src[k] = row_fallback.get(k)
    for key in ("material_batch", "material_id", "material"):
        val = src.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None


def aggregate_energy(
    readings: List[Dict[str, Any]],
    *,
    settings: Optional[Dict[str, Any]] = None,
    machine_names: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Pure aggregation for overview KPIs + breakdowns."""
    settings = settings or {}
    machine_names = machine_names or {}
    co2_factor = _as_float(settings.get("co2_kg_per_kwh"))
    euro_rate = _as_float(settings.get("euro_per_kwh"))
    baseline = _as_float(settings.get("baseline_period_kwh"))
    currency = settings.get("currency") or "EUR"

    total_kwh = 0.0
    kwh_known = False
    live_cost = 0.0
    live_cost_known = False
    derived_cost = 0.0
    derived_cost_used = False

    by_machine: Dict[str, Dict[str, Any]] = {}
    by_material: Dict[str, Dict[str, Any]] = {}

    for row in readings:
        kwh = _as_float(row.get("kwh"))
        cost = _as_float(row.get("cost"))
        mid = str(row.get("machine_id") or "") or "__none__"
        material = extract_material_key(row.get("payload"), row) or "__unassigned__"

        if kwh is not None:
            total_kwh += kwh
            kwh_known = True

        row_cost = cost
        row_cost_source = "LIVE"
        if row_cost is None and kwh is not None and euro_rate is not None:
            row_cost = kwh * euro_rate
            row_cost_source = "DERIVED"
            derived_cost += row_cost
            derived_cost_used = True
        elif row_cost is not None:
            live_cost += row_cost
            live_cost_known = True

        def _bucket(store: Dict[str, Dict[str, Any]], key: str, label: str):
            if key not in store:
                store[key] = {
                    "key": key,
                    "label": label,
                    "kwh": 0.0,
                    "kwh_known": False,
                    "cost": 0.0,
                    "cost_known": False,
                    "cost_source": "LIVE",
                    "readings": 0,
                }
            b = store[key]
            b["readings"] += 1
            if kwh is not None:
                b["kwh"] += kwh
                b["kwh_known"] = True
            if row_cost is not None:
                b["cost"] += row_cost
                b["cost_known"] = True
                if row_cost_source == "DERIVED":
                    b["cost_source"] = "DERIVED"

        _bucket(
            by_machine,
            mid,
            machine_names.get(mid) or (mid if mid != "__none__" else "Unassigned"),
        )
        _bucket(
            by_material,
            material,
            "Unassigned" if material == "__unassigned__" else material,
        )

    total_cost = None
    cost_source = None
    if live_cost_known or derived_cost_used:
        total_cost = live_cost + derived_cost
        if live_cost_known and derived_cost_used:
            cost_source = "MIXED"
        elif derived_cost_used:
            cost_source = "DERIVED"
        else:
            cost_source = "LIVE"

    co2_kg = None
    co2_source = None
    if kwh_known and co2_factor is not None:
        co2_kg = total_kwh * co2_factor
        co2_source = "DERIVED"

    savings = {
        "available": False,
        "baseline_kwh": baseline,
        "actual_kwh": total_kwh if kwh_known else None,
        "savings_kwh": None,
        "savings_cost": None,
        "value_source": "DERIVED",
        "hint": "Set baseline period kWh in Energy settings to compute savings potential.",
    }
    if baseline is not None and kwh_known:
        savings_kwh = max(0.0, baseline - total_kwh)
        savings["available"] = True
        savings["savings_kwh"] = round(savings_kwh, 3)
        savings["hint"] = None
        if euro_rate is not None:
            savings["savings_cost"] = round(savings_kwh * euro_rate, 2)
        else:
            savings["hint"] = "Savings kWh available; set €/kWh to also show cost savings."

    def _finalize_buckets(store: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        rows = []
        for b in store.values():
            rows.append(
                {
                    **b,
                    "kwh": round(b["kwh"], 3) if b["kwh_known"] else None,
                    "cost": round(b["cost"], 2) if b["cost_known"] else None,
                    "co2_kg": round(b["kwh"] * co2_factor, 3)
                    if b["kwh_known"] and co2_factor is not None
                    else None,
                    "co2_source": "DERIVED"
                    if b["kwh_known"] and co2_factor is not None
                    else None,
                }
            )
        rows.sort(key=lambda r: (r.get("kwh") is None, -(r.get("kwh") or 0)))
        return rows

    return {
        "kpis": {
            "readings": len(readings),
            "kwh": round(total_kwh, 3) if kwh_known else None,
            "kwh_source": "LIVE" if kwh_known else None,
            "cost": round(total_cost, 2) if total_cost is not None else None,
            "cost_source": cost_source,
            "co2_kg": round(co2_kg, 3) if co2_kg is not None else None,
            "co2_source": co2_source,
            "currency": currency,
        },
        "savings_potential": savings,
        "by_machine": _finalize_buckets(by_machine),
        "by_material": _finalize_buckets(by_material),
        "settings": {
            "co2_kg_per_kwh": co2_factor,
            "euro_per_kwh": euro_rate,
            "baseline_period_kwh": baseline,
            "currency": currency,
            "co2_configured": co2_factor is not None,
            "tariff_configured": euro_rate is not None,
            "baseline_configured": baseline is not None,
        },
    }


def _settings_dict(row: Optional[EnergySettings], company_id: str) -> Dict[str, Any]:
    if not row:
        return {
            "id": None,
            "company_id": company_id,
            "co2_kg_per_kwh": None,
            "euro_per_kwh": None,
            "baseline_period_kwh": None,
            "currency": "EUR",
            "value_source": "MANUAL",
        }
    return {
        "id": str(row.id),
        "company_id": row.company_id,
        "co2_kg_per_kwh": row.co2_kg_per_kwh,
        "euro_per_kwh": row.euro_per_kwh,
        "baseline_period_kwh": row.baseline_period_kwh,
        "currency": row.currency or "EUR",
        "value_source": "MANUAL",
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


async def get_settings(
    session: AsyncSession, *, company_id: str = "default"
) -> Dict[str, Any]:
    result = await session.execute(
        select(EnergySettings).where(EnergySettings.company_id == company_id).limit(1)
    )
    return _settings_dict(result.scalars().first(), company_id)


async def upsert_settings(
    session: AsyncSession, payload: EnergySettingsUpsert
) -> Dict[str, Any]:
    result = await session.execute(
        select(EnergySettings)
        .where(EnergySettings.company_id == payload.company_id)
        .limit(1)
    )
    row = result.scalars().first()
    data = payload.model_dump()
    if row:
        for k, v in data.items():
            if k == "company_id":
                continue
            setattr(row, k, v)
    else:
        row = EnergySettings(**data)
        session.add(row)
    await session.commit()
    await session.refresh(row)
    return _settings_dict(row, payload.company_id)


async def list_readings(
    session: AsyncSession, *, company_id: str = "default", limit: int = 300
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 300), 1000))
    result = await session.execute(
        select(ImportedEnergyReading)
        .where(ImportedEnergyReading.company_id == company_id)
        .order_by(ImportedEnergyReading.created_at.desc())
        .limit(limit)
    )
    rows = list(result.scalars().all())
    out = []
    for r in rows:
        payload = dict(r.payload_json or {})
        out.append(
            {
                "id": str(r.id),
                "company_id": r.company_id,
                "machine_id": r.machine_id,
                "event_at": r.event_at,
                "kwh": r.kwh,
                "cost": r.cost,
                "material": extract_material_key(payload),
                "payload": payload,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "value_source": "LIVE",
            }
        )
    return out


async def get_overview(
    session: AsyncSession, *, company_id: str = "default", limit: int = 500
) -> Dict[str, Any]:
    settings = await get_settings(session, company_id=company_id)
    readings = await list_readings(session, company_id=company_id, limit=limit)

    machines = (await session.execute(select(Machine))).scalars().all()
    names = {str(m.id): (m.name or str(m.id)) for m in machines}

    agg = aggregate_energy(readings, settings=settings, machine_names=names)
    return {
        "company_id": company_id,
        **agg,
        "readings": readings[:100],
        "settings": {**agg["settings"], **{k: settings.get(k) for k in (
            "id", "company_id", "value_source", "created_at", "updated_at"
        ) if k in settings}},
    }
