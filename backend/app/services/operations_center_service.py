"""
Aggregated Operations Center overview for Mini-PC-friendly single-poll UI.
Combines live plant signals + hardening progress into one cached payload.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alarm import Alarm
from app.models.live_process_window import LiveProcessWindow
from app.services import operations_hardening_service as hardening
from app.services import tsdb_client


_CACHE: Dict[str, Any] = {"at": 0.0, "payload": None}
_CACHE_TTL_SECONDS = 8.0


def _as_float(val: Any) -> Optional[float]:
    try:
        if val is None:
            return None
        return float(val)
    except (TypeError, ValueError):
        return None


def _map_plant_status(machine_state: Optional[str]) -> str:
    if not machine_state:
        return "STOPPED"
    key = str(machine_state).upper()
    mapping = {
        "PRODUCTION": "PRODUCTION",
        "IDLE": "READY",
        "READY": "READY",
        "HEATING": "HEATING",
        "COOLING": "COOLING",
        "OFF": "STOPPED",
        "STOPPED": "STOPPED",
        "FAULT": "FAULT",
        "ERROR": "FAULT",
    }
    return mapping.get(key, "STOPPED")


def _traffic(severity: Optional[int], in_production: bool) -> str:
    if not in_production or severity is None or severity < 0:
        return "grey"
    if severity == 0:
        return "green"
    if severity == 1:
        return "yellow"
    return "red"


def _spark(rows: List[Dict[str, Any]], field: str, limit: int = 60) -> List[float]:
    values: List[float] = []
    for row in rows:
        n = _as_float(row.get(field))
        if n is not None:
            values.append(n)
    return values[-limit:]


def _metric_card(
    *,
    key: str,
    label: str,
    value: Optional[float],
    unit: str,
    spark: List[float],
    traffic: str,
    value_source: str,
) -> Dict[str, Any]:
    has = value is not None
    return {
        "key": key,
        "label": label,
        "value": round(value, 1) if has else "—",
        "unit": unit if has else "",
        "traffic": traffic if has else "grey",
        "normalMin": None,
        "normalMax": None,
        "deviation": None,
        "value_source": value_source if has else "LIVE",
        "lockedHint": None if has else "Waiting for live sensor data",
        "spark": spark,
    }


async def _load_machine_state(session: AsyncSession) -> Optional[str]:
    result = await session.execute(
        select(LiveProcessWindow)
        .order_by(LiveProcessWindow.window_end.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    return getattr(row, "confirmed_state", None) or getattr(row, "state", None)


async def _load_alarms(session: AsyncSession, limit: int = 8) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(Alarm)
        .where(Alarm.status.in_(["open", "acknowledged"]))
        .order_by(Alarm.created_at.desc())
        .limit(limit)
    )
    alarms = list(result.scalars().all())
    return [
        {
            "id": str(a.id),
            "text": a.message,
            "severity": a.severity,
            "value_source": "LIVE",
            "display_label": "LIVE",
        }
        for a in alarms
    ]


async def _load_live_machine_values(
    session: AsyncSession,
    machine_state: Optional[str],
    *,
    company_id: str = "default",
    connected_sources: Optional[List[str]] = None,
) -> Dict[str, Any]:
    in_production = (machine_state or "").upper() == "PRODUCTION"
    rows: List[Dict[str, Any]] = []
    live_ok = False
    feed_error = None

    if tsdb_client.tsdb_configured():
        try:
            rows = await tsdb_client.fetch_extruder_latest_from_tsdb(limit=80)
            live_ok = bool(rows)
        except Exception as exc:  # noqa: BLE001
            feed_error = str(exc)
            rows = []
    else:
        feed_error = "TimescaleDB not configured"

    latest = rows[-1] if rows else {}
    motor = _as_float(latest.get("MotorLoad_amp"))
    speed = _as_float(latest.get("ScrewSpeed_rpm"))
    pressure = _as_float(latest.get("Pressure_bar"))
    temp_avg = None
    temps = [
        _as_float(latest.get("Temp_Zone1_C")),
        _as_float(latest.get("Temp_Zone2_C")),
        _as_float(latest.get("Temp_Zone3_C")),
        _as_float(latest.get("Temp_Zone4_C")),
    ]
    valid_temps = [t for t in temps if t is not None]
    if valid_temps:
        temp_avg = sum(valid_temps) / len(valid_temps)
    zone3 = _as_float(latest.get("Temp_Zone3_C"))

    # Without baseline severity on this path, mark LIVE (not Accuracy)
    traffic = "green" if in_production else "grey"
    cards = [
        _metric_card(
            key="motor_load",
            label="Motor load",
            value=motor,
            unit="amp",
            spark=_spark(rows, "MotorLoad_amp"),
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="screw_speed",
            label="Screw speed",
            value=speed,
            unit="rpm",
            spark=_spark(rows, "ScrewSpeed_rpm"),
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="melt_pressure",
            label="Extruder pressure",
            value=pressure,
            unit="bar",
            spark=_spark(rows, "Pressure_bar"),
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="temp_avg",
            label="Avg. temperature",
            value=round(temp_avg, 1) if temp_avg is not None else None,
            unit="°C",
            spark=[],
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="zone3_temp",
            label="Zone 3 temperature",
            value=zone3,
            unit="°C",
            spark=_spark(rows, "Temp_Zone3_C"),
            traffic=traffic,
            value_source="LIVE",
        ),
    ]

    energy_card = {
        "key": "energy",
        "label": "Energy",
        "value": "—",
        "unit": "",
        "traffic": "grey",
        "normalMin": None,
        "normalMax": None,
        "deviation": None,
        "value_source": "SIMULATED",
        "lockedHint": "Requires energy_data",
        "spark": [],
    }
    sources = set(connected_sources or [])
    if "energy_data" in sources:
        try:
            from app.services import domain_import_sink_service as domain_sink

            latest_energy = await domain_sink.latest_energy_reading(
                session, company_id=company_id
            )
        except Exception:  # noqa: BLE001
            latest_energy = None
        if latest_energy and latest_energy.get("kwh") is not None:
            energy_card = {
                "key": "energy",
                "label": "Energy",
                "value": round(float(latest_energy["kwh"]), 2),
                "unit": "kWh",
                "traffic": "green" if in_production else "grey",
                "normalMin": None,
                "normalMax": None,
                "deviation": None,
                "value_source": "LIVE",
                "lockedHint": None,
                "spark": [],
            }
        else:
            energy_card = {
                **energy_card,
                "value_source": "LIVE",
                "lockedHint": "energy_data connected — awaiting imported readings",
            }
    cards.append(energy_card)

    return {
        "machine_values": cards,
        "live_feed_ok": live_ok,
        "feed_error": feed_error,
        "latest_timestamp": latest.get("TrendDate"),
    }


def _demo_risks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "r1",
            "text": "In 11 Stunden steigt die Wahrscheinlichkeit eines Druckverlusts auf 82%.",
            "value_source": "SIMULATED",
            "display_label": "Demo-Vorhersage",
            "is_customer_decision_relevant": False,
        },
        {
            "id": "r2",
            "text": "Werkzeug erreicht voraussichtlich in 34 Tagen den Wartungsbereich.",
            "value_source": "SIMULATED",
            "display_label": "Demo-Vorhersage",
            "is_customer_decision_relevant": False,
        },
    ]


async def build_operations_center_overview(
    session: AsyncSession,
    *,
    company_id: str = "default",
    bootstrap_if_empty: bool = True,
    use_cache: bool = True,
) -> Dict[str, Any]:
    import time

    now = time.time()
    if use_cache and _CACHE["payload"] and (now - float(_CACHE["at"])) < _CACHE_TTL_SECONDS:
        cached = dict(_CACHE["payload"])
        cached["cache_hit"] = True
        return cached

    if bootstrap_if_empty:
        sources = await hardening.list_data_sources(session, company_id)
        if not sources:
            await hardening.bootstrap_company_defaults(session, company_id=company_id)

    progress = await hardening.get_or_build_progress(session, company_id)
    feature_status_rows = await hardening.list_feature_status(session, company_id)
    events = await hardening.list_progress_events(session, company_id, limit=20)
    integrations = await hardening.list_machine_integrations(session, company_id)

    machine_state = await _load_machine_state(session)
    live_bundle = await _load_live_machine_values(
        session,
        machine_state,
        company_id=company_id,
        connected_sources=list(progress.connected_sources_json or []),
    )
    alarms = await _load_alarms(session)

    connected_machines = sum(1 for m in integrations if (m.integration_score or 0) > 0)
    total_machines = max(len(integrations), connected_machines, 1)

    connected_machine = next((m for m in integrations if (m.integration_score or 0) > 0), None)
    grey_machines = [
        {
            "id": m.machine_id,
            "name": m.machine_name or m.machine_id,
            "connected": False,
            "status": "NOT_CONNECTED",
            "integration_score": m.integration_score,
        }
        for m in integrations
        if (m.integration_score or 0) <= 0
    ][:5]

    features = [
        {
            "feature_key": fs.feature_key,
            "status": fs.status,
            "history_days": fs.history_days,
            "required_days": fs.required_days,
            "missing_sources": list(fs.missing_sources_json or []),
            "notes": dict(fs.notes_json or {}),
            "model_id": fs.model_id,
        }
        for fs in feature_status_rows
    ]

    payload = {
        "company_id": company_id,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "cache_hit": False,
        "poll_hint_seconds": 15,
        "plant_status": _map_plant_status(machine_state),
        "machine_state": machine_state,
        "live_feed_ok": bool(live_bundle["live_feed_ok"]),
        "feed_error": live_bundle.get("feed_error"),
        "digitalization_progress": progress.digitalization_progress,
        "prediction_readiness": progress.prediction_readiness,
        "data_quality_score": progress.data_quality_score,
        "connected_machines": connected_machines or progress.connected_machines,
        "total_machines": max(total_machines, progress.total_machines or 0),
        "connected_sources": list(progress.connected_sources_json or []),
        "missing_sources": list(progress.missing_sources_json or []),
        "machine_values": live_bundle["machine_values"],
        "warnings": alarms
        + (
            [
                {
                    "id": "network-note",
                    "text": "Maschinennetzwerk für weitere Linien noch nicht verbunden.",
                    "value_source": "DERIVED",
                    "display_label": "Abgeleitet",
                }
            ]
            if connected_machines < total_machines
            else []
        ),
        "risks": _demo_risks(),
        "connected_machine": {
            "id": connected_machine.machine_id if connected_machine else "extruder_01",
            "name": (connected_machine.machine_name if connected_machine else "Extruder 1"),
            "type": "extruder",
            "status": machine_state or "UNKNOWN",
            "connected": True,
            "sensors": 21,
            "integration_score": connected_machine.integration_score if connected_machine else 0,
        },
        "grey_machines": grey_machines,
        "feature_status": features,
        "recent_progress_events": [
            {
                "event_type": ev.event_type,
                "source": ev.source,
                "old_progress": ev.old_progress,
                "new_progress": ev.new_progress,
                "old_readiness": ev.old_readiness,
                "new_readiness": ev.new_readiness,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
                "details": dict(ev.details_json or {}),
            }
            for ev in events
        ],
        "network_notes": [
            "Machine network not yet connected for remaining lines",
            "Quality connection missing",
            "Maintenance connection missing",
        ],
    }

    _CACHE["at"] = now
    _CACHE["payload"] = payload
    return payload
