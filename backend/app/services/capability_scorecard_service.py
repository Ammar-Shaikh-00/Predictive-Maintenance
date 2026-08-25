"""Capability scorecard — execute catalog formulas against live probes.

Catalog owner: AI/ML via Docs/capability_component_catalog.json.
This module never invents Accuracy %. Digitalization, work_pct, and model
accuracy stay separate.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alarm import Alarm
from app.models.baseline_registry import BaselineRegistry
from app.models.energy_center import EnergySettings
from app.models.imported_domain_events import (
    ImportedEnergyReading,
    ImportedMaintenanceEvent,
    ImportedMaterialBatch,
    ImportedOperatorEvent,
    ImportedQualityEvent,
)
from app.models.live_process_window import LiveProcessWindow
from app.models.live_run_evaluation import LiveRunEvaluation
from app.models.production_run import ProductionRun
from app.models.quality_record import QualityRecord
from app.models.ticket import Ticket
from app.services import ai_service_health as ai_health
from app.services import live_monitor_health as lm_health
from app.services import prediction_readiness_service as ml_readiness
from app.services import tsdb_client
from app.services.capability_catalog import catalog_unlock_index, load_capability_catalog
from app.services.machine_identity import resolve_machine_uuid

EXPECTED_SENSOR_CHANNELS = (
    "Val_1",
    "Val_5",
    "Val_6",
    "Val_7",
    "Val_8",
    "Val_9",
    "Val_10",
    "Val_11",
    "Val_27",
    "Val_28",
    "Val_29",
    "Val_30",
    "Val_31",
    "Val_32",
)
ANOMALY_MODELS_EXPECTED = 6
BASELINE_REGIMES = ("LOW", "MID", "HIGH")


def _ids_match(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return False
    sa, sb = str(a).strip().lower(), str(b).strip().lower()
    if sa == sb:
        return True
    return sa.replace("-", "") == sb.replace("-", "")


def _as_aware(dt: Any) -> Optional[datetime]:
    if dt is None:
        return None
    if isinstance(dt, str):
        raw = dt.strip()
        if not raw:
            return None
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def age_seconds(dt: Any, *, now: Optional[datetime] = None) -> Optional[float]:
    parsed = _as_aware(dt)
    if parsed is None:
        return None
    clock = now or datetime.now(timezone.utc)
    if clock.tzinfo is None:
        clock = clock.replace(tzinfo=timezone.utc)
    return (clock - parsed).total_seconds()


def clamp_pct(value: Any) -> int:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return 0
    return int(round(max(0.0, min(100.0, n))))


def machine_data_work_pct(age: Optional[float]) -> int:
    if age is None:
        return 0
    if age <= 60:
        return 100
    if age <= 660:
        return clamp_pct(max(0.0, 100 - (age - 60) / 6))
    return 0


def evaluate_component(spec: Dict[str, Any], facts: Dict[str, Any]) -> Dict[str, Any]:
    """Apply one catalog formula to gathered facts. Pure — used by tests."""
    key = str(spec.get("component_key") or "")
    unlocks = _unlocks_for(spec, facts.get("unlock_index") or {})
    default_source = str(spec.get("value_source") or "LIVE")

    handlers = {
        "ai_server": _eval_ai_server,
        "machine_data": _eval_machine_data,
        "machine_state": _eval_machine_state,
        "live_sensors": _eval_live_sensors,
        "production_history": _eval_production_history,
        "quality_data": _eval_quality_data,
        "maintenance_history": _eval_maintenance_history,
        "material_batches": _eval_material_batches,
        "energy_data": _eval_energy_data,
        "operator_events": _eval_operator_events,
        "models_validated": _eval_models_validated,
        "opc_ua": _eval_always_locked_integration,
        "erp": _eval_erp,
        "live_process_windows": _eval_live_process_windows,
        "live_run_evaluations": _eval_live_run_evaluations,
        "state_classifier": _eval_state_classifier,
        "anomaly_models": _eval_anomaly_models,
        "drift_monitor": _eval_drift_monitor,
        "baseline_registry": _eval_baseline_registry,
        "prediction_readiness": _eval_prediction_readiness,
        "alarms_tickets": _eval_alarms_tickets,
    }
    handler = handlers.get(key, _eval_unknown)
    status, work_pct, hint, detail, value_source = handler(spec, facts)
    return {
        "component_key": key,
        "label_de": spec.get("label_de"),
        "label_en": spec.get("label_en"),
        "category": spec.get("category"),
        "sort_order": spec.get("sort_order") or 0,
        "show_on_scorecard": bool(spec.get("show_on_scorecard")),
        "contributes_to_digitalization": bool(spec.get("contributes_to_digitalization")),
        "weight": float(spec.get("weight") or 0),
        "status": status,
        "work_pct": clamp_pct(work_pct),
        "value_source": value_source or default_source,
        "hint_de": hint,
        "detail": detail or {},
        "unlocks": unlocks,
        # Pass-through metadata from catalog so AI/ML updates are visible in OC UI.
        "provided_by": spec.get("provided_by"),
        "provided_by_live_monitor": spec.get("provided_by_live_monitor"),
        "ml_provides_now": spec.get("ml_provides_now"),
        "expected_work_pct_now": spec.get("expected_work_pct_now"),
    }


def _unlocks_for(spec: Dict[str, Any], index: Dict[str, Dict[str, Any]]) -> List[Dict[str, str]]:
    keys = spec.get("unlocks_feature_keys") or []
    out: List[Dict[str, str]] = []
    for feature_key in keys:
        row = index.get(feature_key) or {}
        out.append(
            {
                "feature_key": str(feature_key),
                "label_de": str(row.get("label_de") or feature_key),
                "label_en": str(row.get("label_en") or feature_key),
            }
        )
    return out


def _hint(spec: Dict[str, Any], status: str) -> str:
    if status == "locked":
        return str(spec.get("hint_locked_de") or "")
    return str(spec.get("hint_active_de") or "")


def _eval_ai_server(spec, facts):
    ok = bool(facts.get("ai_healthy"))
    status = "active" if ok else "locked"
    return status, 100 if ok else 0, _hint(spec, status), {"healthy": ok}, "LIVE"


def _eval_machine_data(spec, facts):
    age = facts.get("tsdb_age_seconds")
    work = machine_data_work_pct(age)
    if age is None:
        status = "locked"
    elif age <= 60:
        status = "active"
    elif work > 0:
        status = "degraded"
    else:
        status = "locked"
    return status, work, _hint(spec, status), {"age_seconds": age}, "LIVE"


def _eval_machine_state(spec, facts):
    state = facts.get("detected_state")
    age = facts.get("eval_age_seconds")
    expected = set(facts.get("expected_ml_states") or [])
    in_expected = str(state or "").upper() in expected
    if in_expected and age is not None and age <= 120:
        status, work = "active", 100
    elif state:
        status, work = "degraded", 40
    else:
        status, work = "locked", 0
    return (
        status,
        work,
        _hint(spec, status),
        {
            "detected_state": state,
            "age_seconds": age,
            "machine_scope_fallback": bool(facts.get("eval_scope_fallback")),
            "eval_machine_id": facts.get("eval_machine_id"),
        },
        "MODEL_PREDICTION",
    )


def _eval_live_sensors(spec, facts):
    present = int(facts.get("tsdb_channels_present") or 0)
    expected = int(facts.get("tsdb_channels_expected") or len(EXPECTED_SENSOR_CHANNELS))
    work = clamp_pct(present / expected * 100) if expected else 0
    if present <= 0:
        status = "locked"
    elif work < 80:
        status = "degraded"
    else:
        status = "active"
    return (
        status,
        work,
        _hint(spec, status),
        {"present_channels": present, "expected_channels": expected},
        "LIVE",
    )


def _present_work_pct(spec, fallback: int = 60) -> int:
    """Catalog-driven cap when a source is present (production_history = 60, not 100)."""
    settings = spec.get("settings") if isinstance(spec.get("settings"), dict) else {}
    for raw in (settings.get("work_pct_if_present"), spec.get("expected_work_pct_now")):
        if raw is None:
            continue
        try:
            return clamp_pct(raw)
        except (TypeError, ValueError):
            continue
    return clamp_pct(fallback)


def _eval_production_history(spec, facts):
    count = int(facts.get("run_count") or 0)
    complete = bool(facts.get("latest_run_complete"))
    if count < 1:
        return "locked", 0, _hint(spec, "locked"), {"run_count": 0}, "LIVE"
    # Catalog: 60 if run_count>=1 (product_name may be placeholder — do not credit 100).
    work = _present_work_pct(spec, 60)
    status = "active" if complete else "degraded"
    return (
        status,
        work,
        _hint(spec, status),
        {"run_count": count, "latest_run_complete": complete},
        "LIVE",
    )


def _eval_quality_data(spec, facts):
    events = int(facts.get("qc_event_count") or 0)
    days = int(facts.get("qc_days_last_30") or 0)
    if events <= 0:
        return "locked", 0, _hint(spec, "locked"), {"qc_event_count": 0}, "LIVE"
    work = clamp_pct(days / 30 * 100)
    status = "active" if work >= 80 else "degraded"
    return status, work, _hint(spec, status), {"qc_event_count": events, "qc_days_last_30": days}, "LIVE"


def _eval_maintenance_history(spec, facts):
    events = int(facts.get("maintenance_event_count") or 0)
    days = int(facts.get("maintenance_history_days") or 0)
    if events <= 0:
        return "locked", 0, _hint(spec, "locked"), {"event_count": 0}, "LIVE"
    work = clamp_pct(min(100, days / 60 * 100))
    status = "active" if work >= 80 else "degraded"
    return (
        status,
        work,
        _hint(spec, status),
        {"event_count": events, "history_days": days},
        "LIVE",
    )


def _eval_material_batches(spec, facts):
    batches = int(facts.get("material_batch_count") or 0)
    linked = int(facts.get("material_linked_runs") or 0)
    total = int(facts.get("material_total_runs") or 0)
    if batches <= 0:
        return "locked", 0, _hint(spec, "locked"), {"batch_count": 0}, "LIVE"
    work = clamp_pct(linked / max(total, 1) * 100)
    status = "active" if work >= 80 else "degraded"
    return (
        status,
        work,
        _hint(spec, status),
        {"batch_count": batches, "linked_runs": linked, "total_runs": total},
        "LIVE",
    )


def _eval_energy_data(spec, facts):
    kwh = facts.get("energy_latest_kwh")
    baseline = bool(facts.get("energy_baseline"))
    if kwh is None:
        return "locked", 0, _hint(spec, "locked"), {"latest_kwh": None}, "LIVE"
    if baseline:
        status, work = "active", 100
    else:
        status, work = "degraded", 50
    return status, work, _hint(spec, status), {"latest_kwh": kwh, "baseline": baseline}, "LIVE"


def _eval_operator_events(spec, facts):
    count = int(facts.get("operator_event_count_7d") or 0)
    if count <= 0:
        return "locked", 0, _hint(spec, "locked"), {"event_count_7d": 0}, "LIVE"
    work = clamp_pct(min(100, count * 10))
    status = "active" if work >= 80 else "degraded"
    return status, work, _hint(spec, status), {"event_count_7d": count}, "LIVE"


def _eval_models_validated(spec, facts):
    ok = bool(facts.get("models_validated"))
    status = "active" if ok else "locked"
    return status, 100 if ok else 0, _hint(spec, status), {"validated": ok}, "MANUAL"


def _eval_always_locked_integration(spec, facts):
    return "locked", 0, _hint(spec, "locked"), {}, "LIVE"


def _eval_erp(spec, facts):
    populated = int(facts.get("erp_populated_fields") or 0)
    expected = int(facts.get("erp_expected_fields") or 3)
    if populated <= 0:
        return "locked", 0, _hint(spec, "locked"), {"populated_order_fields": 0}, "LIVE"
    work = clamp_pct(populated / max(expected, 1) * 100)
    status = "active" if work >= 80 else "degraded"
    return (
        status,
        work,
        _hint(spec, status),
        {"populated_order_fields": populated, "expected_order_fields": expected},
        "LIVE",
    )


def _eval_live_process_windows(spec, facts):
    age = facts.get("window_age_seconds")
    ok = age is not None and age <= 120
    status = "active" if ok else "locked"
    return status, 100 if ok else 0, _hint(spec, status), {"age_seconds": age}, "LIVE"


def _eval_live_run_evaluations(spec, facts):
    age = facts.get("eval_age_seconds")
    overall = facts.get("eval_overall_status")
    ok = age is not None and age <= 120 and overall is not None
    status = "active" if ok else "locked"
    return (
        status,
        100 if ok else 0,
        _hint(spec, status),
        {"age_seconds": age, "overall_status": overall},
        "RULE_BASED",
    )


def _eval_state_classifier(spec, facts):
    loaded = facts.get("classifier_loaded")
    if loaded is True:
        return "active", 100, _hint(spec, "active"), {"classifier_loaded": True}, "LIVE"
    if loaded is False or facts.get("lm_reachable") is False:
        return "locked", 0, _hint(spec, "locked"), {"classifier_loaded": False}, "LIVE"
    # Probe did not report the field — do not invent 100
    return (
        "degraded",
        0,
        _hint(spec, "locked"),
        {"classifier_loaded": None},
        "LIVE",
    )


def _eval_anomaly_models(spec, facts):
    loaded = int(facts.get("ml_models_loaded") or 0)
    expected = int(facts.get("ml_models_expected") or ANOMALY_MODELS_EXPECTED)
    work = clamp_pct(loaded / max(expected, 1) * 100)
    if loaded <= 0:
        status = "locked"
    elif loaded < expected:
        status = "degraded"
    else:
        status = "active"
    return (
        status,
        work,
        _hint(spec, status),
        {
            "loaded": loaded,
            "expected": expected,
            "probe_url": facts.get("lm_health_url"),
            "probe_error": facts.get("lm_health_error"),
        },
        "LIVE",
    )


def _eval_drift_monitor(spec, facts):
    score = facts.get("eval_drift_score")
    pipeline = bool(facts.get("lm_pipeline"))
    baseline = facts.get("lm_drift_baseline")
    if score is not None:
        status, work = "active", 100
    elif baseline:
        status, work = "active", 100
    elif pipeline:
        status, work = "degraded", 40
    else:
        status, work = "locked", 0
    return (
        status,
        work,
        _hint(spec, status),
        {"drift_score": score, "drift_baseline_loaded": baseline},
        "DERIVED",
    )


def _eval_baseline_registry(spec, facts):
    present = int(facts.get("regimes_present") or 0)
    work = clamp_pct(present / 3 * 100)
    if present <= 0:
        status = "locked"
    elif present < 3:
        status = "degraded"
    else:
        status = "active"
    return status, work, _hint(spec, status), {"regimes_present": present}, "LIVE"


def _eval_prediction_readiness(spec, facts):
    readiness = facts.get("readiness")
    if readiness is None:
        return "locked", 0, _hint(spec, "locked"), {"readiness": None}, "MODEL_PREDICTION"
    work = clamp_pct(readiness)
    status = "active" if work > 0 else "locked"
    return status, work, _hint(spec, status), {"readiness": work}, "MODEL_PREDICTION"


def _eval_alarms_tickets(spec, facts):
    ok = bool(facts.get("alarms_queryable"))
    status = "active" if ok else "locked"
    return status, 100 if ok else 0, _hint(spec, status), {"queryable": ok}, "LIVE"


def _eval_unknown(spec, facts):
    return "locked", 0, _hint(spec, "locked"), {"error": "unknown_component"}, spec.get("value_source")


def compute_scores(components: Sequence[Dict[str, Any]]) -> Dict[str, Optional[int]]:
    digi_rows = [
        c
        for c in components
        if c.get("contributes_to_digitalization")
    ]
    progress = sum(
        float(c.get("weight") or 0)
        for c in digi_rows
        if c.get("status") in ("active", "degraded")
    )
    weight_sum = sum(float(c.get("weight") or 0) for c in digi_rows) or 0
    if weight_sum > 0:
        work_index = round(
            sum(float(c.get("weight") or 0) * float(c.get("work_pct") or 0) / 100 for c in digi_rows)
            / weight_sum
            * 100
        )
    else:
        work_index = 0
    ml_rows = [c for c in components if c.get("category") == "ml"]
    if ml_rows:
        ml_index = round(sum(float(c.get("work_pct") or 0) for c in ml_rows) / len(ml_rows))
    else:
        ml_index = 0
    return {
        "digitalization_progress": clamp_pct(progress),
        "capability_work_index": clamp_pct(work_index),
        "ml_serving_index": clamp_pct(ml_index),
    }


def _channel_present(row: Dict[str, Any], name: str) -> bool:
    if name in row and row.get(name) is not None:
        return True
    # asyncpg / mapping may keep original case
    for key, val in row.items():
        if str(key) == name and val is not None:
            return True
    return False


def _count_sensor_channels(row: Any) -> int:
    if not row:
        return 0
    if hasattr(row, "keys") and not isinstance(row, dict):
        try:
            row = dict(row)
        except Exception:
            row = {k: row[k] for k in row.keys()}
    if not isinstance(row, dict):
        return 0
    return sum(1 for name in EXPECTED_SENSOR_CHANNELS if _channel_present(row, name))


def _empty_payload(
    *,
    company_id: str,
    machine_id: Optional[str],
    error: str,
) -> Dict[str, Any]:
    return {
        "company_id": company_id,
        "machine_id": machine_id,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "digitalization_progress": 0,
        "capability_work_index": 0,
        "ml_serving_index": 0,
        "connected_machines": 0,
        "total_machines": 0,
        "models_loaded": 0,
        "models_expected": ANOMALY_MODELS_EXPECTED,
        "locked_count": 0,
        "value_source": "DERIVED",
        "spec_version": None,
        "catalog_updated_at": None,
        "health_bands": {"green_min": 80, "yellow_min": 40, "red_max": 39},
        "components": [],
        "error": error,
    }


async def build_capability_scorecard(
    session: AsyncSession,
    *,
    company_id: str = "default",
    machine_id: Optional[str] = None,
    connected_machines: int = 0,
    total_machines: int = 0,
) -> Dict[str, Any]:
    try:
        catalog = load_capability_catalog()
    except Exception as exc:  # noqa: BLE001
        return _empty_payload(
            company_id=company_id,
            machine_id=machine_id,
            error=str(exc),
        )

    facts = await _gather_facts(
        session,
        company_id=company_id,
        machine_id=machine_id,
        catalog=catalog,
    )
    components = [
        evaluate_component(spec, facts)
        for spec in catalog.get("components") or []
        if spec.get("enabled_in_product", True)
    ]
    components.sort(key=lambda row: int(row.get("sort_order") or 0))
    if total_machines <= 0:
        try:
            from app.models.machine import Machine

            total_machines = int(
                (await session.execute(select(func.count()).select_from(Machine))).scalar()
                or 0
            )
        except Exception:  # noqa: BLE001
            total_machines = 0
    scores = compute_scores(components)
    anomaly = next((c for c in components if c["component_key"] == "anomaly_models"), None)
    locked_count = sum(
        1
        for c in components
        if c.get("show_on_scorecard")
        and c.get("contributes_to_digitalization")
        and c.get("status") == "locked"
    )
    models_loaded = int((anomaly or {}).get("detail", {}).get("loaded") or 0)
    bands = catalog.get("health_bands") or {}
    return {
        "company_id": company_id,
        "machine_id": machine_id,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "digitalization_progress": scores["digitalization_progress"],
        "capability_work_index": scores["capability_work_index"],
        "ml_serving_index": scores["ml_serving_index"],
        "connected_machines": connected_machines,
        "total_machines": total_machines,
        "models_loaded": models_loaded,
        "models_expected": ANOMALY_MODELS_EXPECTED,
        "locked_count": locked_count,
        "value_source": "DERIVED",
        "spec_version": catalog.get("spec_version"),
        "catalog_updated_at": catalog.get("updated_at"),
        "catalog_path": catalog.get("_loaded_from"),
        "health_bands": {
            "green_min": int(bands.get("green_min") or 80),
            "yellow_min": int(bands.get("yellow_min") or 40),
            "red_max": int(bands.get("red_max") or 39),
        },
        "components": components,
    }


async def _gather_facts(
    session: AsyncSession,
    *,
    company_id: str,
    machine_id: Optional[str],
    catalog: Dict[str, Any],
) -> Dict[str, Any]:
    ai_task = ai_health.probe_ai_service_health()
    lm_task = lm_health.probe_live_monitor_health()
    tsdb_task = _safe_tsdb_latest()
    ai_res, lm_res, tsdb_row = await asyncio.gather(ai_task, lm_task, tsdb_task)

    eval_row, eval_scope_fallback = await _latest_eval(session, machine_id)
    window_row = await _latest_window(session, machine_id)
    run_facts = await _production_facts(session, machine_id)
    quality = await _quality_facts(session, company_id)
    maintenance = await _maintenance_facts(session, company_id)
    material = await _material_facts(session, company_id, run_facts["run_count"])
    energy = await _energy_facts(session, company_id)
    operators = await _operator_facts(session, company_id)
    regimes = await _baseline_regimes(session)
    validated = await _models_validated(session)
    alarms_ok = await _alarms_queryable(session)
    readiness_row = await ml_readiness.resolve_machine_prediction_readiness(
        session, company_id=company_id, machine_id=machine_id
    )

    tsdb_age = None
    channels = 0
    if tsdb_row:
        tsdb_age = age_seconds(tsdb_row.get("TrendDate") or tsdb_row.get("time_utc"))
        channels = _count_sensor_channels(tsdb_row)

    eval_age = age_seconds(getattr(eval_row, "created_at", None) if eval_row else None)
    window_age = age_seconds(getattr(window_row, "window_end", None) if window_row else None)
    eval_machine_id = (
        str(getattr(eval_row, "machine_id", "") or "") if eval_row else None
    )
    scope_fallback = eval_scope_fallback

    classifier = None
    if lm_res.classifier_loaded is not None:
        classifier = lm_res.classifier_loaded

    readiness_val = None
    if readiness_row.get("available") and readiness_row.get("value") is not None:
        readiness_val = readiness_row.get("value")
    elif lm_res.prediction_readiness is not None:
        readiness_val = lm_res.prediction_readiness

    return {
        "unlock_index": catalog_unlock_index(catalog),
        "expected_ml_states": [
            str(s).upper() for s in (catalog.get("expected_ml_states") or [])
        ],
        "ai_healthy": bool(ai_res.healthy),
        "tsdb_age_seconds": tsdb_age,
        "tsdb_channels_present": channels,
        "tsdb_channels_expected": len(EXPECTED_SENSOR_CHANNELS),
        "detected_state": getattr(eval_row, "detected_state", None) if eval_row else None,
        "eval_age_seconds": eval_age,
        "eval_machine_id": eval_machine_id,
        "eval_scope_fallback": scope_fallback,
        "eval_overall_status": getattr(eval_row, "overall_status", None) if eval_row else None,
        "eval_drift_score": getattr(eval_row, "drift_score", None) if eval_row else None,
        "window_age_seconds": window_age,
        "run_count": run_facts["run_count"],
        "latest_run_complete": run_facts["latest_run_complete"],
        "erp_populated_fields": run_facts["erp_populated_fields"],
        "erp_expected_fields": 3,
        "qc_event_count": quality["count"],
        "qc_days_last_30": quality["days"],
        "maintenance_event_count": maintenance["count"],
        "maintenance_history_days": maintenance["days"],
        "material_batch_count": material["batches"],
        "material_linked_runs": material["linked_runs"],
        "material_total_runs": material["total_runs"],
        "energy_latest_kwh": energy["kwh"],
        "energy_baseline": energy["baseline"],
        "operator_event_count_7d": operators,
        "models_validated": validated,
        "lm_reachable": lm_res.reachable,
        "lm_pipeline": lm_res.pipeline,
        "lm_health_url": lm_res.url,
        "lm_health_error": lm_res.error,
        "classifier_loaded": classifier,
        "ml_models_loaded": len(lm_res.ml_models_loaded or []),
        "ml_models_expected": int(lm_res.models_expected or ANOMALY_MODELS_EXPECTED),
        "lm_drift_baseline": lm_res.drift_baseline_loaded,
        "regimes_present": regimes,
        "readiness": readiness_val,
        "alarms_queryable": alarms_ok,
    }


async def _safe_tsdb_latest() -> Optional[Dict[str, Any]]:
    if not tsdb_client.tsdb_configured():
        return None
    try:
        raw = await tsdb_client.fetch_extruder_latest_all_columns_from_tsdb()
        if not raw:
            rows = await tsdb_client.fetch_extruder_latest_from_tsdb(limit=1)
            return rows[-1] if rows else None
        if hasattr(raw, "keys") and not isinstance(raw, dict):
            return dict(raw)
        return raw if isinstance(raw, dict) else None
    except Exception:  # noqa: BLE001
        return None


async def _latest_eval(
    session: AsyncSession, machine_id: Optional[str]
) -> tuple[Optional[LiveRunEvaluation], bool]:
    """Latest live_run_evaluation for the selected machine UUID from `machine` table."""
    try:
        stmt = select(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc())
        if machine_id:
            resolved = await resolve_machine_uuid(session, str(machine_id))
            if resolved is None:
                return None, False
            stmt = stmt.where(LiveRunEvaluation.machine_id == resolved)
        result = await session.execute(stmt.limit(1))
        return result.scalar_one_or_none(), False
    except Exception:  # noqa: BLE001
        return None, False


async def _latest_window(session: AsyncSession, machine_id: Optional[str]):
    try:
        stmt = select(LiveProcessWindow).order_by(LiveProcessWindow.id.desc())
        if machine_id:
            resolved = await resolve_machine_uuid(session, str(machine_id))
            if resolved is None:
                return None
            stmt = stmt.where(LiveProcessWindow.machine_id == resolved)
        result = await session.execute(stmt.limit(1))
        return result.scalar_one_or_none()
    except Exception:  # noqa: BLE001
        return None


async def _production_facts(session: AsyncSession, machine_id: Optional[str]) -> Dict[str, Any]:
    empty = {
        "run_count": 0,
        "latest_run_complete": False,
        "erp_populated_fields": 0,
    }
    try:
        count_stmt = select(func.count()).select_from(ProductionRun)
        latest_stmt = select(ProductionRun).order_by(ProductionRun.id.desc()).limit(1)
        if machine_id:
            resolved = await resolve_machine_uuid(session, str(machine_id))
            result = await session.execute(
                select(ProductionRun).order_by(ProductionRun.id.desc()).limit(200)
            )
            rows = [
                r
                for r in result.scalars().all()
                if _ids_match(getattr(r, "machine_id", None), machine_id)
                or (
                    resolved is not None
                    and _ids_match(getattr(r, "machine_id", None), resolved)
                )
            ]
            if not rows:
                return empty
            latest_run = rows[0]
            return {
                "run_count": len(rows),
                "latest_run_complete": bool(latest_run.product_name and latest_run.start_time),
                "erp_populated_fields": _erp_fields(latest_run),
            }
        count = int((await session.execute(count_stmt)).scalar() or 0)
        latest = (await session.execute(latest_stmt)).scalar_one_or_none()
        return {
            "run_count": count,
            "latest_run_complete": bool(latest and latest.product_name and latest.start_time),
            "erp_populated_fields": _erp_fields(latest),
        }
    except Exception:  # noqa: BLE001
        return empty


def _erp_fields(run: Optional[ProductionRun]) -> int:
    if run is None:
        return 0
    return sum(
        1
        for val in (run.target_qty, run.customer_order, run.eta_at)
        if val is not None and str(val).strip() != ""
    )


async def _quality_facts(session: AsyncSession, company_id: str) -> Dict[str, int]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    count = 0
    days: set = set()
    try:
        imported = (
            await session.execute(
                select(ImportedQualityEvent).where(
                    ImportedQualityEvent.company_id == company_id
                )
            )
        ).scalars().all()
        count += len(imported)
        for row in imported:
            dt = _as_aware(row.event_at) or _as_aware(getattr(row, "created_at", None))
            if dt and dt >= cutoff:
                days.add(dt.date().isoformat())
    except Exception:
        pass
    try:
        records = (await session.execute(select(QualityRecord))).scalars().all()
        count += len(records)
        for row in records:
            dt = _as_aware(getattr(row, "created_at", None))
            if dt and dt >= cutoff:
                days.add(dt.date().isoformat())
    except Exception:
        pass
    day_n = len(days)
    if count > 0 and day_n == 0:
        day_n = 1
    return {"count": count, "days": day_n}


async def _maintenance_facts(session: AsyncSession, company_id: str) -> Dict[str, int]:
    stamps: List[datetime] = []
    count = 0
    try:
        imported = (
            await session.execute(
                select(ImportedMaintenanceEvent).where(
                    ImportedMaintenanceEvent.company_id == company_id
                )
            )
        ).scalars().all()
        count += len(imported)
        for row in imported:
            dt = _as_aware(row.event_at) or _as_aware(getattr(row, "created_at", None))
            if dt:
                stamps.append(dt)
    except Exception:
        pass
    try:
        tickets = (
            await session.execute(
                select(Ticket).where(Ticket.status.in_(["resolved", "done", "completed"]))
            )
        ).scalars().all()
        count += len(tickets)
        for row in tickets:
            dt = _as_aware(getattr(row, "updated_at", None) or getattr(row, "created_at", None))
            if dt:
                stamps.append(dt)
    except Exception:
        pass
    if count <= 0:
        return {"count": 0, "days": 0}
    if not stamps:
        return {"count": count, "days": 1}
    oldest = min(stamps)
    days = max(1, int((datetime.now(timezone.utc) - oldest).total_seconds() // 86400))
    return {"count": count, "days": days}


async def _material_facts(
    session: AsyncSession, company_id: str, run_count: int
) -> Dict[str, int]:
    batches = 0
    linked = 0
    try:
        rows = (
            await session.execute(
                select(ImportedMaterialBatch).where(
                    ImportedMaterialBatch.company_id == company_id
                )
            )
        ).scalars().all()
        batches = len(rows)
        keys = {str(r.material_batch).strip() for r in rows if r.material_batch}
        if keys:
            runs = (await session.execute(select(ProductionRun.batch_no))).scalars().all()
            linked = sum(1 for b in runs if b and str(b).strip() in keys)
    except Exception:
        pass
    return {"batches": batches, "linked_runs": linked, "total_runs": run_count}


async def _energy_facts(session: AsyncSession, company_id: str) -> Dict[str, Any]:
    kwh = None
    baseline = False
    try:
        row = (
            await session.execute(
                select(ImportedEnergyReading)
                .where(ImportedEnergyReading.company_id == company_id)
                .order_by(ImportedEnergyReading.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if row is not None:
            kwh = row.kwh
    except Exception:
        pass
    try:
        settings = (
            await session.execute(
                select(EnergySettings).where(EnergySettings.company_id == company_id)
            )
        ).scalar_one_or_none()
        baseline = bool(settings and settings.baseline_period_kwh is not None)
    except Exception:
        pass
    return {"kwh": kwh, "baseline": baseline}


async def _operator_facts(session: AsyncSession, company_id: str) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    try:
        rows = (
            await session.execute(
                select(ImportedOperatorEvent).where(
                    ImportedOperatorEvent.company_id == company_id
                )
            )
        ).scalars().all()
        n = 0
        for row in rows:
            dt = _as_aware(row.event_at) or _as_aware(getattr(row, "created_at", None))
            if dt is None or dt >= cutoff:
                n += 1
        return n
    except Exception:
        return 0


async def _baseline_regimes(session: AsyncSession) -> int:
    try:
        rows = (await session.execute(select(BaselineRegistry.regime_type))).scalars().all()
        present = set()
        for raw in rows:
            key = str(raw or "").upper()
            for regime in BASELINE_REGIMES:
                if regime in key:
                    present.add(regime)
        return len(present)
    except Exception:
        return 0


async def _models_validated(session: AsyncSession) -> bool:
    """Only true when a validated model_versions row exists — never invent Accuracy."""
    try:
        exists = await session.execute(
            text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_name = 'model_versions' LIMIT 1"
            )
        )
        if exists.scalar() is None:
            return False
        row = await session.execute(
            text(
                "SELECT 1 FROM model_versions "
                "WHERE validated IS TRUE OR validated = 'true' LIMIT 1"
            )
        )
        return row.scalar() is not None
    except Exception:
        return False


async def _alarms_queryable(session: AsyncSession) -> bool:
    try:
        await session.execute(select(Alarm.id).limit(1))
        await session.execute(select(Ticket.id).limit(1))
        return True
    except Exception:
        return False
