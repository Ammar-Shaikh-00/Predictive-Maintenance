"""
Aggregated Operations Center overview for Mini-PC-friendly single-poll UI.
Combines live plant signals + hardening progress into one cached payload.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alarm import Alarm
from app.models.live_run_evaluation import LiveRunEvaluation
from app.models.machine import Machine
from app.services import maintenance_center_service as maintenance
from app.services import operations_hardening_service as hardening
from app.services import prediction_readiness_service as ml_readiness
from app.services import ai_findings_service as ai_findings
from app.services import ai_service_health as ai_health
from app.services import tsdb_client
from app.services import machine_identity as mids


_CACHE: Dict[str, Any] = {}  # key -> {"at": float, "payload": dict}
_CACHE_TTL_SECONDS = 8.0
_CACHE_VERSION = 10  # machine.id from DB — no hardcoded machine_id


def clear_operations_center_cache() -> None:
    _CACHE.clear()


def _cache_key(company_id: str, machine_id: Optional[str]) -> str:
    return f"v{_CACHE_VERSION}|{company_id}|{machine_id or ''}"


async def _finalize_overview_payload(
    session: AsyncSession,
    payload: Dict[str, Any],
    *,
    company_id: str,
    machine_id: Optional[str],
) -> Dict[str, Any]:
    """Attach AI/ML readiness + live findings (Modules 7/15/16) on every response."""
    await _apply_ml_readiness_to_payload(
        session, payload, company_id=company_id, machine_id=machine_id
    )
    # Prefer selected_machine_id from payload when caller passed none
    mid = machine_id or payload.get("selected_machine_id")
    await _attach_ai_findings(session, payload, machine_id=mid)
    await _apply_ai_server_health_to_payload(payload)
    await _apply_capability_to_payload(
        session,
        payload,
        company_id=company_id,
        machine_id=mid,
    )
    return payload


async def _apply_capability_to_payload(
    session: AsyncSession,
    payload: Dict[str, Any],
    *,
    company_id: str,
    machine_id: Optional[str],
) -> Dict[str, Any]:
    """Attach catalog-driven scorecard. Digitalization % follows catalog probes."""
    from app.services.capability_scorecard_service import build_capability_scorecard

    capability = await build_capability_scorecard(
        session,
        company_id=company_id,
        machine_id=machine_id,
        connected_machines=int(payload.get("connected_machines") or 0),
        total_machines=int(payload.get("total_machines") or 0),
    )
    payload["capability"] = capability
    if capability.get("error"):
        return payload
    payload["digitalization_progress"] = capability.get(
        "digitalization_progress", payload.get("digitalization_progress")
    )
    return payload


async def _apply_ai_server_health_to_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """KI-Server tick follows live AI_SERVICE_URL/health — never a seeded always-on flag."""
    health = await ai_health.probe_ai_service_health()
    connected, missing, progress = ai_health.apply_ai_server_to_sources(
        payload.get("connected_sources") or [],
        payload.get("missing_sources") or [],
        healthy=health.healthy,
        progress_fn=hardening._progress_from_sources,
    )
    payload["connected_sources"] = connected
    payload["missing_sources"] = missing
    payload["digitalization_progress"] = progress
    payload["ai_server_health"] = {
        "healthy": health.healthy,
        "status": health.status,
        "value_source": "LIVE",
        "http_status": health.http_status,
        "error": health.error,
    }
    return payload


async def _apply_ml_readiness_to_payload(
    session: AsyncSession,
    payload: Dict[str, Any],
    *,
    company_id: str,
    machine_id: Optional[str],
) -> Dict[str, Any]:
    """Always attach AI/ML-owned readiness — never reuse legacy formula values."""
    readiness_row = await ml_readiness.resolve_machine_prediction_readiness(
        session, company_id=company_id, machine_id=machine_id
    )
    payload["prediction_readiness"] = (
        readiness_row.get("value") if readiness_row.get("available") else None
    )
    payload["prediction_readiness_meta"] = readiness_row
    return payload


def _ids_match(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return False
    sa, sb = str(a).strip().lower(), str(b).strip().lower()
    if sa == sb:
        return True
    return sa.replace("-", "") == sb.replace("-", "")


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
        "LOW_PRODUCTION": "LOW_PRODUCTION",
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


def _is_producing(machine_state: Optional[str]) -> bool:
    key = str(machine_state or "").upper()
    return key in ("PRODUCTION", "LOW_PRODUCTION")


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
        "lockedHint": None if has else "Warte auf Live-Sensordaten",
        "spark": spark,
    }


async def _load_machine_state(
    session: AsyncSession, *, machine_id: Optional[str] = None
) -> Optional[str]:
    """Latest detected_state for a real `machine.id` from Postgres."""
    stmt = select(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc())
    if machine_id:
        resolved = await mids.resolve_machine_uuid(session, str(machine_id))
        if resolved is None:
            return None
        stmt = stmt.where(LiveRunEvaluation.machine_id == resolved)
    result = await session.execute(stmt.limit(1))
    row = result.scalar_one_or_none()
    if not row:
        return None
    return getattr(row, "detected_state", None)


async def _load_alarms(
    session: AsyncSession, *, machine_id: Optional[str] = None, limit: int = 8
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(Alarm)
        .where(Alarm.status.in_(["open", "acknowledged"]))
        .order_by(Alarm.created_at.desc())
        .limit(80 if machine_id else limit)
    )
    alarms = list(result.scalars().all())
    if machine_id:
        alarms = [a for a in alarms if _ids_match(a.machine_id, machine_id)][:limit]
    else:
        alarms = alarms[:limit]
    return [
        {
            "id": str(a.id),
            "text": a.message,
            "severity": a.severity,
            "machine_id": str(a.machine_id) if a.machine_id is not None else None,
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
    include_live_feed: bool = True,
) -> Dict[str, Any]:
    if not include_live_feed:
        return {
            "machine_values": [
                _metric_card(
                    key="motor_load",
                    label="Motorlast",
                    value=None,
                    unit="A",
                    spark=[],
                    traffic="grey",
                    value_source="LIVE",
                )
                | {
                    "lockedHint": "Live-Sensordaten für diese Maschine noch nicht angebunden",
                },
                _metric_card(
                    key="screw_speed",
                    label="Schneckendrehzahl",
                    value=None,
                    unit="U/min",
                    spark=[],
                    traffic="grey",
                    value_source="LIVE",
                )
                | {
                    "lockedHint": "Live-Sensordaten für diese Maschine noch nicht angebunden",
                },
                _metric_card(
                    key="melt_pressure",
                    label="Extruderdruck",
                    value=None,
                    unit="bar",
                    spark=[],
                    traffic="grey",
                    value_source="LIVE",
                )
                | {
                    "lockedHint": "Live-Sensordaten für diese Maschine noch nicht angebunden",
                },
                _metric_card(
                    key="temp_avg",
                    label="Durchschnittstemperatur",
                    value=None,
                    unit="°C",
                    spark=[],
                    traffic="grey",
                    value_source="LIVE",
                )
                | {
                    "lockedHint": "Live-Sensordaten für diese Maschine noch nicht angebunden",
                },
                _metric_card(
                    key="zone3_temp",
                    label="Zone-3-Temperatur",
                    value=None,
                    unit="°C",
                    spark=[],
                    traffic="grey",
                    value_source="LIVE",
                )
                | {
                    "lockedHint": "Live-Sensordaten für diese Maschine noch nicht angebunden",
                },
                {
                    "key": "energy",
                    "label": "Energie",
                    "value": "—",
                    "unit": "",
                    "traffic": "grey",
                    "normalMin": None,
                    "normalMax": None,
                    "deviation": None,
                    "value_source": "LIVE",
                    "lockedHint": "Erfordert Energiedaten für diese Maschine",
                    "spark": [],
                },
            ],
            "live_feed_ok": False,
            "feed_error": "Keine Live-Daten für die ausgewählte Maschine",
            "latest_timestamp": None,
        }

    in_production = _is_producing(machine_state)
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
        feed_error = "TimescaleDB nicht konfiguriert"

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
            label="Motorlast",
            value=motor,
            unit="A",
            spark=_spark(rows, "MotorLoad_amp"),
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="screw_speed",
            label="Schneckendrehzahl",
            value=speed,
            unit="U/min",
            spark=_spark(rows, "ScrewSpeed_rpm"),
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="melt_pressure",
            label="Extruderdruck",
            value=pressure,
            unit="bar",
            spark=_spark(rows, "Pressure_bar"),
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="temp_avg",
            label="Durchschnittstemperatur",
            value=round(temp_avg, 1) if temp_avg is not None else None,
            unit="°C",
            spark=[],
            traffic=traffic,
            value_source="LIVE",
        ),
        _metric_card(
            key="zone3_temp",
            label="Zone-3-Temperatur",
            value=zone3,
            unit="°C",
            spark=_spark(rows, "Temp_Zone3_C"),
            traffic=traffic,
            value_source="LIVE",
        ),
    ]

    energy_card = {
        "key": "energy",
        "label": "Energie",
        "value": "—",
        "unit": "",
        "traffic": "grey",
        "normalMin": None,
        "normalMax": None,
        "deviation": None,
        "value_source": "LIVE",
        "lockedHint": "Erfordert Energiedaten",
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
                "label": "Energie",
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
                "lockedHint": "Energiedaten verbunden — warte auf importierte Messwerte",
            }
    cards.append(energy_card)

    return {
        "machine_values": cards,
        "live_feed_ok": live_ok,
        "feed_error": feed_error,
        "latest_timestamp": latest.get("TrendDate"),
    }


def _live_or_rule_risks() -> List[Dict[str, Any]]:
    """Deprecated stub — use ai_findings.build_overview_risks (async)."""
    return []


async def _attach_ai_findings(
    session: AsyncSession,
    payload: Dict[str, Any],
    *,
    machine_id: Optional[str],
) -> Dict[str, Any]:
    """Inject Module 7/15/16 findings from live_run_evaluations into overview."""
    try:
        snap = await ai_findings.build_ai_snapshot(
            session, machine_id=machine_id, history_limit=8
        )
    except Exception:  # noqa: BLE001
        snap = {
            "available": False,
            "risks": [],
            "predictions": [],
            "actions": [],
            "recommendation": None,
        }
    risks = [
        r
        for r in (snap.get("risks") or [])
        if str(r.get("value_source") or "").upper() != "SIMULATED"
    ]
    payload["risks"] = risks
    payload["ai_snapshot"] = {
        "available": bool(snap.get("available")),
        "recommendation": snap.get("recommendation"),
        "predictions": snap.get("predictions") or [],
        "actions": snap.get("actions") or [],
        "latest_window": snap.get("latest_window"),
        "latest_run_evaluation_id": snap.get("latest_run_evaluation_id"),
        "value_source_note": snap.get("value_source_note"),
    }
    return payload


def _parse_iso_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        raw = str(value).strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _days_until(dt: datetime, *, now: Optional[datetime] = None) -> int:
    base = now or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = dt - base
    # Round toward nearest day; overdue → 0 (due now / overdue)
    days = int(round(delta.total_seconds() / 86400.0))
    return max(0, days)


async def _next_maintenance_snapshot(
    session: AsyncSession,
    *,
    company_id: str = "default",
    machine_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Derive next maintenance horizon from real plans / wear parts / RUL.
    Never invents a date — returns available=False with German requirement hint.
    Optionally scoped to one machine from Anlagenübersicht selection.
    """
    requirement_hint = (
        "Benötigt: Wartungsplan oder Verschleißteil-Termin "
        "(Wartungscenter) — wird nicht geschätzt."
    )
    if machine_id:
        requirement_hint = (
            "Für diese Maschine: Wartungsplan oder Verschleißteil-Termin "
            "im Wartungscenter anlegen — wird nicht geschätzt."
        )
    try:
        plans = await maintenance.list_plans(session, company_id=company_id, limit=200)
        wear_parts = await maintenance.list_wear_parts(
            session, company_id=company_id, limit=200
        )
        remaining_life = await maintenance.remaining_life_by_machine(session)
    except Exception:  # noqa: BLE001
        return {
            "available": False,
            "days": None,
            "label": None,
            "value_source": "MANUAL",
            "hint": requirement_hint,
        }

    if machine_id:
        plans = [p for p in plans if _ids_match(p.get("machine_id"), machine_id) or not p.get("machine_id")]
        # Prefer exact machine match; drop unscoped if any scoped exists
        scoped = [p for p in plans if _ids_match(p.get("machine_id"), machine_id)]
        if scoped:
            plans = scoped
        wear_parts = [
            w for w in wear_parts if _ids_match(w.get("machine_id"), machine_id)
        ]
        remaining_life = [
            r for r in remaining_life if _ids_match(r.get("machine_id"), machine_id)
        ]

    candidates: List[Tuple[datetime, str, str]] = []
    now = datetime.now(timezone.utc)

    for plan in plans:
        status = str(plan.get("status") or "").lower()
        if status not in {"planned", "in_progress", "open", "scheduled"}:
            continue
        dt = _parse_iso_dt(plan.get("planned_at"))
        if not dt:
            continue
        title = plan.get("title") or plan.get("component") or "Wartung"
        candidates.append((dt, str(title), str(plan.get("value_source") or "MANUAL")))

    for part in wear_parts:
        dt = _parse_iso_dt(part.get("next_replace_at"))
        if not dt:
            continue
        name = part.get("name") or part.get("component") or "Verschleißteil"
        candidates.append(
            (dt, f"Austausch: {name}", str(part.get("value_source") or "MANUAL"))
        )

    # RUL in days from validated prediction — only when present
    for row in remaining_life:
        if not row.get("available"):
            continue
        rul = row.get("remaining_useful_life")
        if rul is None:
            continue
        try:
            days = int(rul)
        except (TypeError, ValueError):
            continue
        if days < 0:
            continue
        dt = now + timedelta(days=days)
        name = row.get("machine_name") or "Maschine"
        candidates.append((dt, f"RUL {name}", str(row.get("value_source") or "MODEL_PREDICTION")))

    if not candidates:
        return {
            "available": False,
            "days": None,
            "label": None,
            "value_source": "MANUAL",
            "hint": requirement_hint,
        }

    candidates.sort(key=lambda c: c[0])
    soonest_dt, label, source = candidates[0]
    days = _days_until(soonest_dt, now=now)
    return {
        "available": True,
        "days": days,
        "label": label,
        "value_source": source,
        "hint": label if days > 0 else "Fällig / überfällig",
    }


def _oee_snapshot() -> Dict[str, Any]:
    """OEE stays unavailable until ERP + scrap + downtime sources exist."""
    return {
        "available": False,
        "value": None,
        "value_source": "MANUAL",
        "hint": (
            "Benötigt: Stillstandszeiten · Soll-/Ist-Durchsatz · Ausschussdaten "
            "(ERP/MES + Qualität) — wird nicht geschätzt."
        ),
    }


async def build_operations_center_overview(
    session: AsyncSession,
    *,
    company_id: str = "default",
    machine_id: Optional[str] = None,
    bootstrap_if_empty: bool = True,
    use_cache: bool = True,
) -> Dict[str, Any]:
    import time

    # Always rebuild risks/values honestly; short TTL still helps Mini PC after compute.
    now = time.time()
    ckey = _cache_key(company_id, machine_id)
    cached_entry = _CACHE.get(ckey)
    if (
        use_cache
        and cached_entry
        and cached_entry.get("payload")
        and (now - float(cached_entry.get("at") or 0)) < _CACHE_TTL_SECONDS
    ):
        cached = dict(cached_entry["payload"])
        # Never serve stale SIMULATED risks from older process versions
        risks = [
            r
            for r in (cached.get("risks") or [])
            if str(r.get("value_source") or "").upper() != "SIMULATED"
        ]
        cached["risks"] = risks
        mv = [
            m
            for m in (cached.get("machine_values") or [])
            if str(m.get("value_source") or "").upper() != "SIMULATED"
        ]
        if mv:
            cached["machine_values"] = mv
        cached["cache_hit"] = True
        return await _finalize_overview_payload(
            session,
            cached,
            company_id=company_id,
            machine_id=machine_id or cached.get("selected_machine_id"),
        )

    if bootstrap_if_empty:
        sources = await hardening.list_data_sources(session, company_id)
        if not sources:
            await hardening.bootstrap_company_defaults(session, company_id=company_id)

    progress = await hardening.get_or_build_progress(session, company_id)
    feature_status_rows = await hardening.list_feature_status(session, company_id)
    events = await hardening.list_progress_events(session, company_id, limit=20)
    integrations = await hardening.list_machine_integrations(session, company_id)

    # Probe live TSDB independently of integration_score (score can be 0 in DB)
    live_probe = await _load_live_machine_values(
        session,
        None,
        company_id=company_id,
        connected_sources=list(progress.connected_sources_json or []),
        include_live_feed=True,
    )
    live_probe_ok = bool(live_probe.get("live_feed_ok"))

    scored_connected = [m for m in integrations if (m.integration_score or 0) > 0]
    db_machines = await mids.list_machines(session)
    live_uuid = await mids.latest_live_machine_uuid(session)
    live_feed_machine = mids.match_integration(integrations, live_uuid, db_machines)
    if live_feed_machine is None and scored_connected:
        live_feed_machine = scored_connected[0]
    if live_feed_machine is None and live_probe_ok and integrations:
        live_feed_machine = integrations[0]

    # Resolve selection: requested token → Machine UUID → integration row
    selected = None
    resolved_selected = None
    if machine_id:
        resolved_selected = await mids.resolve_machine_uuid(session, str(machine_id))
        selected = next(
            (m for m in integrations if _ids_match(m.machine_id, machine_id)), None
        )
        if selected is None and resolved_selected is not None:
            selected = mids.match_integration(integrations, resolved_selected, db_machines)
    if selected is None:
        selected = live_feed_machine or (
            scored_connected[0] if scored_connected else (integrations[0] if integrations else None)
        )
        if selected is not None:
            resolved_selected = await mids.resolve_machine_uuid(
                session, str(selected.machine_id)
            )

    selected_id = (
        str(resolved_selected)
        if resolved_selected is not None
        else (selected.machine_id if selected else None)
    )
    selected_is_live_owner = bool(
        selected
        and live_uuid is not None
        and (
            _ids_match(selected.machine_id, live_uuid)
            or (resolved_selected is not None and _ids_match(resolved_selected, live_uuid))
        )
    )
    selected_connected = bool(
        selected
        and (
            (selected.integration_score or 0) > 0
            or (live_probe_ok and selected_is_live_owner)
            or resolved_selected is not None
        )
    )
    include_live_feed = bool(live_probe_ok and selected_is_live_owner)

    live_owner_state = None
    if live_uuid is not None:
        live_owner_state = await _load_machine_state(
            session, machine_id=str(live_uuid)
        )

    machine_state = await _load_machine_state(session, machine_id=selected_id)
    if machine_state is None and include_live_feed:
        machine_state = live_owner_state

    if include_live_feed:
        live_bundle = live_probe
        # Align traffic lights with plant state without a second TSDB round-trip
        in_prod = _is_producing(machine_state)
        traffic = "green" if in_prod else "grey"
        for card in live_bundle.get("machine_values") or []:
            if not isinstance(card, dict):
                continue
            if card.get("value") not in (None, "—") and card.get("key") != "energy":
                card["traffic"] = traffic
    else:
        live_bundle = await _load_live_machine_values(
            session,
            machine_state,
            company_id=company_id,
            connected_sources=list(progress.connected_sources_json or []),
            include_live_feed=False,
        )
        # Make empty state machine-specific so UI visibly changes on selection
        name = (selected.machine_name if selected else None) or selected_id or "Maschine"
        hint = f"Keine Live-Sensordaten für {name} — Maschine noch nicht angebunden"
        for card in live_bundle.get("machine_values") or []:
            if isinstance(card, dict) and card.get("value") in (None, "—"):
                card["lockedHint"] = hint
        live_bundle["feed_error"] = hint

    alarms = await _load_alarms(session, machine_id=selected_id)
    next_maintenance = await _next_maintenance_snapshot(
        session, company_id=company_id, machine_id=selected_id
    )
    oee = _oee_snapshot()
    sel_name = (selected.machine_name if selected else None) or selected_id or "diese Maschine"
    oee = {
        **oee,
        "hint": (
            f"Für {sel_name}: Stillstandszeiten · Soll-/Ist-Durchsatz · "
            "Ausschussdaten (ERP/MES + Qualität) — wird nicht geschätzt."
        ),
    }

    # Display connected count: scored OR live owner when TSDB is up
    display_connected_ids = {
        m.machine_id for m in scored_connected
    }
    if live_probe_ok and live_feed_machine:
        display_connected_ids.add(live_feed_machine.machine_id)
    connected_machines = len(display_connected_ids)
    db_machine_count = int(
        (
            await session.execute(select(func.count()).select_from(Machine))
        ).scalar_one()
        or 0
    )
    total_machines = max(
        db_machine_count,
        len(integrations),
        connected_machines,
    )

    line_machines = []
    seen_ids = set()

    async def _append_machine(*, machine_row, integration, is_live_owner: bool):
        mid = str(machine_row.id) if machine_row is not None else (
            integration.machine_id if integration else None
        )
        if not mid or mid in seen_ids:
            return
        seen_ids.add(mid)
        if integration and integration.machine_id:
            seen_ids.add(str(integration.machine_id))
        is_conn = bool(
            (integration and (integration.integration_score or 0) > 0)
            or (live_probe_ok and is_live_owner)
            or (machine_row is not None and live_uuid is not None and _ids_match(machine_row.id, live_uuid))
        )
        status = "NOT_CONNECTED"
        if is_conn:
            if is_live_owner:
                status = live_owner_state or "READY"
            else:
                status = "READY"
        line_machines.append(
            {
                "id": mid,
                "name": (
                    (machine_row.name if machine_row else None)
                    or (integration.machine_name if integration else None)
                    or mid
                ),
                "connected": is_conn,
                "status": status,
                "integration_score": integration.integration_score if integration else 0,
                "has_live_feed": bool(live_probe_ok and is_live_owner),
                "line_id": None,
            }
        )

    for machine_row in db_machines:
        integ = mids.match_integration(integrations, machine_row.id, db_machines)
        is_live_owner = bool(live_uuid is not None and _ids_match(machine_row.id, live_uuid))
        await _append_machine(
            machine_row=machine_row, integration=integ, is_live_owner=is_live_owner
        )

    for m in integrations:
        resolved = await mids.resolve_machine_uuid(session, str(m.machine_id))
        if resolved is not None and str(resolved) in seen_ids:
            continue
        if m.machine_id in seen_ids:
            continue
        is_live_owner = bool(
            live_uuid is not None
            and (
                _ids_match(m.machine_id, live_uuid)
                or (resolved is not None and _ids_match(resolved, live_uuid))
            )
        )
        machine_row = next(
            (row for row in db_machines if resolved is not None and row.id == resolved),
            None,
        )
        await _append_machine(
            machine_row=machine_row, integration=m, is_live_owner=is_live_owner
        )

    # Put live owner first for map friendliness
    if live_feed_machine or live_uuid is not None:
        live_id = str(live_uuid) if live_uuid else live_feed_machine.machine_id
        line_machines.sort(
            key=lambda row: (
                0 if _ids_match(row["id"], live_id) else 1,
                0 if row.get("connected") else 1,
                str(row.get("name") or ""),
            )
        )

    grey_machines = [
        {
            "id": m["id"],
            "name": m["name"],
            "connected": False,
            "status": "NOT_CONNECTED",
            "integration_score": m.get("integration_score"),
        }
        for m in line_machines
        if not m["connected"]
    ][:8]

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

    plant_status = _map_plant_status(machine_state) if machine_state else "STOPPED"
    if selected_id and not selected_connected and not machine_state:
        plant_status = "STOPPED"

    # Aktive-Alarme KPI uses only real Alarm rows — do not inject network/setup notes here
    # (those already live in network_notes / timeline).
    warnings = list(alarms)

    payload = {
        "company_id": company_id,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "cache_hit": False,
        "poll_hint_seconds": 15,
        "selected_machine_id": selected_id,
        "selected_machine_name": sel_name if selected_id else None,
        "plant_status": plant_status,
        "machine_state": machine_state,
        "live_feed_ok": bool(live_bundle.get("live_feed_ok")),
        "feed_error": live_bundle.get("feed_error"),
        "digitalization_progress": progress.digitalization_progress,
        "data_quality_score": progress.data_quality_score,
        "oee": oee,
        "next_maintenance": next_maintenance,
        "connected_machines": connected_machines or progress.connected_machines,
        "total_machines": db_machine_count,
        "connected_sources": list(progress.connected_sources_json or []),
        "missing_sources": list(progress.missing_sources_json or []),
        "machine_values": live_bundle["machine_values"],
        "warnings": warnings,
        "risks": [],
        "ai_snapshot": None,
        "line_machines": line_machines,
        "connected_machine": {
            "id": selected_id
            or (str(live_uuid) if live_uuid else None)
            or (live_feed_machine.machine_id if live_feed_machine else None),
            "name": sel_name
            if selected
            else (
                (live_feed_machine.machine_name if live_feed_machine else None)
                or next((m.name for m in db_machines), None)
                or "Maschine"
            ),
            "type": "extruder",
            "status": machine_state
            or ("NOT_CONNECTED" if not selected_connected else "UNKNOWN"),
            "connected": selected_connected,
            "sensors": 21 if include_live_feed else 0,
            "integration_score": selected.integration_score if selected else 0,
            "has_live_feed": include_live_feed,
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
            "Maschinennetzwerk für weitere Linien noch nicht verbunden",
            "Qualitätsanbindung fehlt",
            "Wartungsanbindung fehlt",
        ],
    }

    _CACHE[ckey] = {"at": now, "payload": payload}
    return await _finalize_overview_payload(
        session,
        payload,
        company_id=company_id,
        machine_id=selected_id,
    )
