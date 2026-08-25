"""Module 20 — Executive View aggregation (management KPIs).

Never invents Accuracy, AI ROI, or utilization. Missing values stay null / —.
AI benefit surfaces Prediction Readiness only (not model Accuracy).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.production_run import ProductionRun
from app.models.ticket import Ticket
from app.services import domain_import_sink_service as domain_sink
from app.services import energy_center_service as energy_svc
from app.services import operations_hardening_service as hardening
from app.services import prediction_readiness_service as ml_readiness
from app.services.operations_center_service import (
    _load_alarms,
    _load_machine_state,
    _map_plant_status,
)


def _kpi(
    *,
    key: str,
    label: str,
    value: Any,
    unit: str = "",
    value_source: str,
    available: bool,
    hint: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "value": value if available else None,
        "display": value if available else "—",
        "unit": unit if available else "",
        "value_source": value_source if available else "MANUAL",
        "available": available,
        "hint": hint,
    }


def build_executive_payload(
    *,
    plant_status: Optional[str],
    produced_today: Optional[float],
    scrap_today: Optional[float],
    energy_kwh: Optional[float],
    energy_cost: Optional[float],
    energy_cost_source: Optional[str],
    savings_kwh: Optional[float],
    savings_cost: Optional[float],
    savings_available: bool,
    open_alarms: int,
    open_tickets: int,
    critical_tickets: int,
    connected_machines: int,
    total_machines: int,
    digitalization_progress: Optional[float],
    prediction_readiness: Optional[float],
    data_quality_score: Optional[float],
    top_problems: List[Dict[str, Any]],
    currency: str = "EUR",
) -> Dict[str, Any]:
    """Pure builder for executive KPIs + sections."""
    # Utilization / availability / downtime: only when we have enough plant signal
    in_prod = (plant_status or "").upper() == "PRODUCTION"
    utilization = None
    utilization_available = False
    availability = None
    availability_available = False
    # Honest rule: with only binary plant state we cannot claim % utilization/availability
    util_hint = "Erfordert Schichtkalender / Laufzeithistorie."
    avail_hint = util_hint
    downtime_hint = "Erfordert Stillstands-Ereignishistorie."

    produced_available = produced_today is not None
    scrap_available = scrap_today is not None
    energy_available = energy_kwh is not None

    kpis = [
        _kpi(
            key="produced_today",
            label="Heute produziert",
            value=round(produced_today, 1) if produced_available else None,
            unit="Stk",
            value_source="LIVE",
            available=produced_available,
            hint=None if produced_available else "Keine Ist-Menge aus Produktionslauf für heute",
        ),
        _kpi(
            key="utilization",
            label="Auslastung",
            value=utilization,
            unit="%",
            value_source="DERIVED",
            available=utilization_available,
            hint=util_hint,
        ),
        _kpi(
            key="scrap",
            label="Ausschuss heute",
            value=round(scrap_today, 2) if scrap_available else None,
            unit="",
            value_source="LIVE",
            available=scrap_available,
            hint=None if scrap_available else "Keine Qualitäts-Ausschussimporte für heute",
        ),
        _kpi(
            key="availability",
            label="Verfügbarkeit",
            value=availability,
            unit="%",
            value_source="DERIVED",
            available=availability_available,
            hint=avail_hint,
        ),
        _kpi(
            key="energy",
            label="Energie",
            value=round(energy_kwh, 1) if energy_available else None,
            unit="kWh",
            value_source="LIVE",
            available=energy_available,
            hint=None if energy_available else "Energiedaten verbinden / Messwerte importieren",
        ),
        _kpi(
            key="downtime",
            label="Stillstand",
            value=None,
            unit="h",
            value_source="LIVE",
            available=False,
            hint=downtime_hint,
        ),
    ]

    top_savings: List[Dict[str, Any]] = []
    if savings_available and savings_kwh is not None:
        top_savings.append(
            {
                "id": "energy-baseline",
                "title": "Energie vs. Basislinienzeitraum",
                "value": round(savings_kwh, 1),
                "unit": "kWh",
                "cost": round(savings_cost, 2) if savings_cost is not None else None,
                "currency": currency,
                "value_source": "DERIVED",
            }
        )

    # AI benefit = ML-reported readiness only — never invent from source weights
    ai_benefit = {
        "label": "Vorhersagebereitschaft",
        "value": round(float(prediction_readiness), 1)
        if prediction_readiness is not None
        else None,
        "unit": "%",
        "value_source": "AI_SERVICE",
        "available": prediction_readiness is not None,
        "hint": "Vom KI-Dienst je Maschine gemeldet.",
    }

    ai_roi = {
        "label": "ROI der KI",
        "value": None,
        "unit": "",
        "value_source": "MANUAL",
        "available": False,
        "hint": "Noch nicht verfügbar. Erscheint erst, wenn validierte Modellergebnisse und eine Kostenbasislinie vorliegen.",
    }

    return {
        "plant_status": plant_status or "STOPPED",
        "in_production": in_prod,
        "kpis": kpis,
        "energy_cost": {
            "value": round(energy_cost, 2) if energy_cost is not None else None,
            "currency": currency,
            "value_source": energy_cost_source or "LIVE",
            "available": energy_cost is not None,
        },
        "top_problems": top_problems,
        "top_savings": top_savings,
        "ai_benefit": ai_benefit,
        "ai_roi": ai_roi,
        "progress": {
            "digitalization_progress": digitalization_progress,
            "prediction_readiness": prediction_readiness,
            "data_quality_score": data_quality_score,
            "connected_machines": connected_machines,
            "total_machines": total_machines,
            "open_alarms": open_alarms,
            "open_tickets": open_tickets,
            "critical_tickets": critical_tickets,
        },
    }


def _parse_day(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    s = str(value)
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date().isoformat()
    except Exception:  # noqa: BLE001
        return None


def _today_utc() -> str:
    return datetime.now(timezone.utc).date().isoformat()


async def _produced_today(session: AsyncSession, today: str) -> Optional[float]:
    result = await session.execute(
        select(ProductionRun).order_by(ProductionRun.id.desc()).limit(200)
    )
    runs = list(result.scalars().all())
    total = 0.0
    found = False
    for r in runs:
        # Prefer start_time / created_at day match
        day = None
        for attr in ("start_time", "started_at", "created_at"):
            val = getattr(r, attr, None)
            if val is not None:
                day = _parse_day(val.isoformat() if hasattr(val, "isoformat") else str(val))
                if day:
                    break
        if day != today:
            continue
        qty = getattr(r, "actual_qty", None)
        if qty is None:
            continue
        try:
            total += float(qty)
            found = True
        except (TypeError, ValueError):
            continue
    return total if found else None


async def _scrap_today(session: AsyncSession, company_id: str, today: str) -> Optional[float]:
    rows = await domain_sink.list_quality_events(session, company_id=company_id, limit=300)
    total = 0.0
    found = False
    for row in rows:
        day = _parse_day(row.get("event_at")) or _parse_day(row.get("created_at"))
        if day != today:
            continue
        scrap = row.get("scrap")
        if scrap is None:
            continue
        try:
            total += float(scrap)
            found = True
        except (TypeError, ValueError):
            continue
    return total if found else None


async def _ticket_counts(session: AsyncSession) -> Dict[str, int]:
    result = await session.execute(select(Ticket).order_by(Ticket.created_at.desc()).limit(500))
    tickets = list(result.scalars().all())
    open_set = {"open", "assigned", "in_progress"}
    open_n = 0
    critical = 0
    for t in tickets:
        st = str(t.status or "").lower()
        if st in open_set:
            open_n += 1
            if str(t.priority or "").lower() == "critical":
                critical += 1
    return {"open": open_n, "critical": critical}


async def get_executive_overview(
    session: AsyncSession, *, company_id: str = "default"
) -> Dict[str, Any]:
    today = _today_utc()

    sources = await hardening.list_data_sources(session, company_id)
    if not sources:
        await hardening.bootstrap_company_defaults(session, company_id=company_id)

    progress = await hardening.get_or_build_progress(session, company_id)
    integrations = await hardening.list_machine_integrations(session, company_id)
    machine_state = await _load_machine_state(session)
    plant_status = _map_plant_status(machine_state)
    alarms = await _load_alarms(session, limit=5)
    tickets = await _ticket_counts(session)

    produced = await _produced_today(session, today)
    scrap = await _scrap_today(session, company_id, today)

    energy = await energy_svc.get_overview(session, company_id=company_id, limit=500)
    ek = energy.get("kpis") or {}
    sav = energy.get("savings_potential") or {}

    top_problems: List[Dict[str, Any]] = []
    for a in alarms:
        top_problems.append(
            {
                "id": a.get("id"),
                "kind": "alarm",
                "severity": a.get("severity"),
                "text": a.get("text"),
                "value_source": "LIVE",
            }
        )
    # Fill with critical ticket titles if few alarms
    if len(top_problems) < 5:
        trows = (
            await session.execute(select(Ticket).order_by(Ticket.created_at.desc()).limit(20))
        ).scalars().all()
        for t in trows:
            if str(t.status or "").lower() not in {"open", "assigned", "in_progress"}:
                continue
            if str(t.priority or "").lower() not in {"critical", "high"}:
                continue
            top_problems.append(
                {
                    "id": str(t.id),
                    "kind": "ticket",
                    "severity": t.priority,
                    "text": t.title,
                    "value_source": "LIVE",
                }
            )
            if len(top_problems) >= 5:
                break

    connected_machines = sum(1 for m in integrations if (m.integration_score or 0) > 0)
    total_machines = max(len(integrations), connected_machines, progress.total_machines or 0, 1)

    body = build_executive_payload(
        plant_status=plant_status,
        produced_today=produced,
        scrap_today=scrap,
        energy_kwh=ek.get("kwh"),
        energy_cost=ek.get("cost"),
        energy_cost_source=ek.get("cost_source"),
        savings_kwh=sav.get("savings_kwh") if sav.get("available") else None,
        savings_cost=sav.get("savings_cost") if sav.get("available") else None,
        savings_available=bool(sav.get("available")),
        open_alarms=len(alarms),
        open_tickets=tickets["open"],
        critical_tickets=tickets["critical"],
        connected_machines=connected_machines or progress.connected_machines or 0,
        total_machines=total_machines,
        digitalization_progress=progress.digitalization_progress,
        prediction_readiness=await ml_readiness.get_company_prediction_readiness_average(
            session, company_id=company_id
        ),
        data_quality_score=progress.data_quality_score,
        top_problems=top_problems[:5],
        currency=ek.get("currency") or "EUR",
    )

    return {
        "company_id": company_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "as_of_day": today,
        "poll_hint_seconds": 30,
        **body,
    }
