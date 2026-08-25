from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from uuid import uuid4

from app.models.operations_hardening import (
    DataQualitySnapshot,
    DataSource,
    FeatureCapability,
    FeatureStatus,
    IntegrationProgress,
    MachineIntegration,
    ProgressEvent,
    SignalNormalizationMap,
    SourceImportRow,
)
from app.schemas.operations_hardening import DataQualityInput
from app.services.data_connectors import fetch_connector_rows, quality_ratios_from_rows
from app.services.data_connectors.common import extract_row_meta


DIGITALIZATION_WEIGHTS: Dict[str, float] = {
    "ai_server": 10,
    "machine_data": 15,
    "machine_state": 10,
    "live_sensors": 10,
    "production_history": 10,
    "quality_data": 15,
    "maintenance_history": 10,
    "material_batches": 5,
    "energy_data": 5,
    "operator_events": 5,
    "models_validated": 5,
}

READINESS_WEIGHTS: Dict[str, float] = {
    "data_coverage": 0.30,
    "data_quality": 0.20,
    "history_length": 0.20,
    "label_coverage": 0.15,
    "machine_coverage": 0.10,
    "system_stability": 0.05,
}

DEFAULT_SIGNAL_ALIASES: Dict[str, str] = {
    "temp_zone_1": "extruder.temperature.zone_1",
    "zone1temp": "extruder.temperature.zone_1",
    "t_z1": "extruder.temperature.zone_1",
    "heatingzone01": "extruder.temperature.zone_1",
    "screw_speed": "extruder.screw.speed",
    "motor_load": "extruder.motor.load",
    "melt_pressure": "extruder.melt.pressure",
    "throughput": "extruder.output.throughput",
    "material_flow": "extruder.material.flow",
}


@dataclass
class ProgressComputation:
    digitalization_progress: float
    prediction_readiness: float
    data_quality_score: float
    connected_sources: List[str]
    missing_sources: List[str]
    connected_machines: int
    total_machines: int


async def list_data_sources(session: AsyncSession, company_id: str) -> List[DataSource]:
    result = await session.execute(
        select(DataSource).where(DataSource.company_id == company_id).order_by(DataSource.source_key.asc())
    )
    return list(result.scalars().all())


async def upsert_data_source(
    session: AsyncSession,
    payload: Dict[str, Any],
) -> DataSource:
    result = await session.execute(
        select(DataSource).where(
            DataSource.company_id == payload["company_id"],
            DataSource.source_key == payload["source_key"],
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        record = DataSource(
            company_id=payload["company_id"],
            source_key=payload["source_key"],
            name=payload["name"],
            category=payload["category"],
        )
        session.add(record)

    for field, value in payload.items():
        if field == "fields":
            setattr(record, "fields_json", value)
        elif field == "settings":
            setattr(record, "settings_json", value)
        elif hasattr(record, field):
            setattr(record, field, value)
    await session.flush()
    return record


async def upsert_machine_integration(
    session: AsyncSession,
    payload: Dict[str, Any],
) -> MachineIntegration:
    result = await session.execute(
        select(MachineIntegration).where(
            MachineIntegration.company_id == payload["company_id"],
            MachineIntegration.machine_id == payload["machine_id"],
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        record = MachineIntegration(
            company_id=payload["company_id"],
            machine_id=payload["machine_id"],
        )
        session.add(record)
    for field, value in payload.items():
        if hasattr(record, field):
            setattr(record, field, value)
    await session.flush()
    return record


async def list_machine_integrations(session: AsyncSession, company_id: str) -> List[MachineIntegration]:
    result = await session.execute(
        select(MachineIntegration)
        .where(MachineIntegration.company_id == company_id)
        .order_by(MachineIntegration.machine_name.asc().nullslast(), MachineIntegration.machine_id.asc())
    )
    return list(result.scalars().all())


async def upsert_feature_capability(session: AsyncSession, payload: Dict[str, Any]) -> FeatureCapability:
    result = await session.execute(
        select(FeatureCapability).where(
            FeatureCapability.company_id == payload["company_id"],
            FeatureCapability.feature_key == payload["feature_key"],
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        record = FeatureCapability(
            company_id=payload["company_id"],
            feature_key=payload["feature_key"],
            name=payload["name"],
        )
        session.add(record)
    for field, value in payload.items():
        if field == "required_sources":
            setattr(record, "required_sources_json", value)
        elif field == "recommended_sources":
            setattr(record, "recommended_sources_json", value)
        elif hasattr(record, field):
            setattr(record, field, value)
    await session.flush()
    return record


async def list_feature_capabilities(session: AsyncSession, company_id: str) -> List[FeatureCapability]:
    result = await session.execute(
        select(FeatureCapability)
        .where(FeatureCapability.company_id == company_id, FeatureCapability.enabled.is_(True))
        .order_by(FeatureCapability.feature_key.asc())
    )
    return list(result.scalars().all())


def _bounded_percent(value: float) -> float:
    return max(0.0, min(100.0, round(value, 2)))


def compute_data_quality_score(sources: Sequence[DataSource]) -> float:
    if not sources:
        return 0.0
    source_scores: List[float] = []
    for s in sources:
        components = [s.completeness_score, s.freshness_score, s.reliability_score]
        source_scores.append(sum(components) / len(components) * 100.0)
    return _bounded_percent(sum(source_scores) / len(source_scores))


def _progress_from_sources(connected_source_keys: Iterable[str]) -> float:
    connected = set(connected_source_keys)
    total = 0.0
    for key, weight in DIGITALIZATION_WEIGHTS.items():
        if key in connected:
            total += weight
    return _bounded_percent(total)


def _readiness_from_inputs(
    *,
    data_coverage: float,
    data_quality: float,
    history_length: float,
    label_coverage: float,
    machine_coverage: float,
    system_stability: float,
) -> float:
    weighted = (
        data_coverage * READINESS_WEIGHTS["data_coverage"]
        + data_quality * READINESS_WEIGHTS["data_quality"]
        + history_length * READINESS_WEIGHTS["history_length"]
        + label_coverage * READINESS_WEIGHTS["label_coverage"]
        + machine_coverage * READINESS_WEIGHTS["machine_coverage"]
        + system_stability * READINESS_WEIGHTS["system_stability"]
    )
    return _bounded_percent(weighted)


def _machine_integration_score(mi: MachineIntegration) -> int:
    checks = [
        mi.network_connected,
        mi.process_data_connected,
        mi.state_data_connected,
        mi.quality_linked,
        mi.maintenance_linked,
        mi.material_linked,
        mi.energy_linked,
    ]
    return int(round((sum(1 for c in checks if c) / max(1, len(checks))) * 100))


async def _upsert_integration_progress(
    session: AsyncSession,
    company_id: str,
    data: ProgressComputation,
) -> IntegrationProgress:
    result = await session.execute(
        select(IntegrationProgress).where(IntegrationProgress.company_id == company_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = IntegrationProgress(company_id=company_id)
        session.add(row)
    row.digitalization_progress = data.digitalization_progress
    row.prediction_readiness = data.prediction_readiness
    row.data_quality_score = data.data_quality_score
    row.connected_machines = data.connected_machines
    row.total_machines = data.total_machines
    row.connected_sources_json = data.connected_sources
    row.missing_sources_json = data.missing_sources
    await session.flush()
    return row


async def record_progress_event(
    session: AsyncSession,
    *,
    company_id: str,
    event_type: str,
    source: Optional[str] = None,
    feature_key: Optional[str] = None,
    actor: Optional[str] = None,
    old_progress: Optional[float] = None,
    new_progress: Optional[float] = None,
    old_readiness: Optional[float] = None,
    new_readiness: Optional[float] = None,
    details: Optional[Dict[str, Any]] = None,
) -> ProgressEvent:
    row = ProgressEvent(
        company_id=company_id,
        event_type=event_type,
        source=source,
        feature_key=feature_key,
        actor=actor,
        old_progress=old_progress,
        new_progress=new_progress,
        old_readiness=old_readiness,
        new_readiness=new_readiness,
        details_json=details or {},
    )
    session.add(row)
    await session.flush()
    return row


async def recompute_progress_and_features(
    session: AsyncSession,
    company_id: str,
    actor: Optional[str] = None,
) -> ProgressComputation:
    sources = await list_data_sources(session, company_id)
    capabilities = await list_feature_capabilities(session, company_id)
    integrations = await list_machine_integrations(session, company_id)

    connected_sources = sorted(
        [s.source_key for s in sources if s.status.lower() in {"connected", "active"}]
    )
    all_source_keys = sorted({s.source_key for s in sources})
    missing_sources = [k for k in all_source_keys if k not in connected_sources]

    data_quality = compute_data_quality_score(sources)
    digitalization_progress = _progress_from_sources(connected_sources)

    total_machines = len(integrations)
    connected_machines = sum(1 for m in integrations if _machine_integration_score(m) > 0)

    # Vorhersagebereitschaft is owned by AI/ML (per-machine table) — do not invent from weights
    from app.services import prediction_readiness_service as ml_readiness

    ml_avg = await ml_readiness.get_company_prediction_readiness_average(
        session, company_id=company_id
    )
    # Mirror ML roll-up only — never persist legacy formula scores (e.g. 38%)
    prediction_readiness = float(ml_avg) if ml_avg is not None else 0.0

    old_progress_row_result = await session.execute(
        select(IntegrationProgress).where(IntegrationProgress.company_id == company_id)
    )
    old_progress_row = old_progress_row_result.scalar_one_or_none()
    old_progress = old_progress_row.digitalization_progress if old_progress_row else None
    old_readiness = old_progress_row.prediction_readiness if old_progress_row else None

    result = ProgressComputation(
        digitalization_progress=digitalization_progress,
        prediction_readiness=prediction_readiness,
        data_quality_score=data_quality,
        connected_sources=connected_sources,
        missing_sources=missing_sources,
        connected_machines=connected_machines,
        total_machines=total_machines,
    )
    await _upsert_integration_progress(session, company_id, result)

    await _recompute_feature_statuses(
        session,
        company_id=company_id,
        connected_sources=connected_sources,
        capabilities=capabilities,
    )

    if old_progress != digitalization_progress or old_readiness != prediction_readiness:
        await record_progress_event(
            session,
            company_id=company_id,
            event_type="PROGRESS_RECOMPUTED",
            actor=actor,
            old_progress=old_progress,
            new_progress=digitalization_progress,
            old_readiness=old_readiness,
            new_readiness=prediction_readiness,
        )

    await session.commit()
    return result


async def _recompute_feature_statuses(
    session: AsyncSession,
    *,
    company_id: str,
    connected_sources: List[str],
    capabilities: List[FeatureCapability],
) -> List[FeatureStatus]:
    existing_result = await session.execute(
        select(FeatureStatus).where(FeatureStatus.company_id == company_id)
    )
    existing = {row.feature_key: row for row in existing_result.scalars().all()}
    computed: List[FeatureStatus] = []
    connected_set = set(connected_sources)

    for cap in capabilities:
        required = list(cap.required_sources_json or [])
        missing = [s for s in required if s not in connected_set]
        history_days = min(180, cap.minimum_history_days)

        if missing:
            status = "LOCKED"
        elif history_days < cap.minimum_history_days:
            status = "COLLECTING_DATA"
        elif cap.validation_required:
            status = "VALIDATION_REQUIRED"
        else:
            status = "ACTIVE"

        row = existing.get(cap.feature_key)
        if row is None:
            row = FeatureStatus(company_id=company_id, feature_key=cap.feature_key)
            session.add(row)
        row.status = status
        row.history_days = history_days
        row.required_days = cap.minimum_history_days
        row.missing_sources_json = missing
        row.notes_json = {
            "name": cap.name,
            "description": cap.description,
            "required_sources": required,
            "recommended_sources": list(cap.recommended_sources_json or []),
        }
        computed.append(row)
    await session.flush()
    return computed


async def list_feature_status(session: AsyncSession, company_id: str) -> List[FeatureStatus]:
    result = await session.execute(
        select(FeatureStatus).where(FeatureStatus.company_id == company_id).order_by(FeatureStatus.feature_key.asc())
    )
    return list(result.scalars().all())


async def list_progress_events(session: AsyncSession, company_id: str, limit: int = 20) -> List[ProgressEvent]:
    result = await session.execute(
        select(ProgressEvent)
        .where(ProgressEvent.company_id == company_id)
        .order_by(ProgressEvent.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_or_build_progress(session: AsyncSession, company_id: str) -> IntegrationProgress:
    result = await session.execute(
        select(IntegrationProgress).where(IntegrationProgress.company_id == company_id)
    )
    row = result.scalar_one_or_none()
    if row is not None:
        return row
    data = await recompute_progress_and_features(session, company_id=company_id)
    result = await session.execute(
        select(IntegrationProgress).where(IntegrationProgress.company_id == company_id)
    )
    return result.scalar_one()


def score_data_quality(input_row: DataQualityInput) -> Tuple[float, Dict[str, float], List[str]]:
    completeness = max(0.0, min(1.0, 1.0 - input_row.missing_values_ratio))
    freshness = max(0.0, min(1.0, 1.0 - input_row.stale_ratio))
    consistency = max(0.0, min(1.0, 1.0 - input_row.duplicate_ratio))
    validity = max(0.0, min(1.0, 1.0 - input_row.invalid_ratio))
    availability = max(0.0, min(1.0, input_row.availability_ratio))

    score = _bounded_percent((completeness + freshness + consistency + validity + availability) / 5.0 * 100.0)
    issues: List[str] = []
    if completeness < 0.9:
        issues.append("missing_values_detected")
    if freshness < 0.9:
        issues.append("stale_data_detected")
    if consistency < 0.95:
        issues.append("duplicate_or_constant_values_detected")
    if validity < 0.95:
        issues.append("invalid_or_unrealistic_values_detected")
    if availability < 0.95:
        issues.append("source_availability_below_target")

    return score, {
        "completeness": completeness,
        "freshness": freshness,
        "consistency": consistency,
        "validity": validity,
        "availability": availability,
    }, issues


async def save_data_quality_snapshot(session: AsyncSession, input_row: DataQualityInput) -> DataQualitySnapshot:
    score, metrics, issues = score_data_quality(input_row)
    existing_res = await session.execute(
        select(DataQualitySnapshot).where(
            DataQualitySnapshot.company_id == input_row.company_id,
            DataQualitySnapshot.source_key == input_row.source_key,
        )
    )
    row = existing_res.scalar_one_or_none()
    if row is None:
        row = DataQualitySnapshot(company_id=input_row.company_id, source_key=input_row.source_key)
        session.add(row)

    row.completeness = metrics["completeness"]
    row.freshness = metrics["freshness"]
    row.consistency = metrics["consistency"]
    row.validity = metrics["validity"]
    row.availability = metrics["availability"]
    row.quality_score = score
    row.issues_json = issues
    await session.commit()
    await session.refresh(row)
    return row


async def normalize_signal_key(
    session: AsyncSession,
    machine_type: str,
    raw_key: str,
    canonical_key: Optional[str] = None,
    unit: Optional[str] = None,
) -> Tuple[str, str]:
    machine_type = machine_type.lower().strip()
    raw_key_norm = raw_key.lower().strip()

    existing_res = await session.execute(
        select(SignalNormalizationMap).where(
            SignalNormalizationMap.machine_type == machine_type,
            SignalNormalizationMap.raw_key == raw_key_norm,
            SignalNormalizationMap.active.is_(True),
        )
    )
    row = existing_res.scalar_one_or_none()
    if row:
        return row.canonical_key, "registry"

    resolved = canonical_key or DEFAULT_SIGNAL_ALIASES.get(raw_key_norm) or f"{machine_type}.{raw_key_norm.replace('_', '.')}"
    new_row = SignalNormalizationMap(
        machine_type=machine_type,
        raw_key=raw_key_norm,
        canonical_key=resolved,
        unit=unit,
        active=True,
    )
    session.add(new_row)
    await session.commit()
    return resolved, "auto"


def enrich_timeline_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensure all timeline join keys are present for cross-source correlation.
    """
    enriched = dict(record)
    for key in (
        "company_id",
        "site_id",
        "line_id",
        "machine_id",
        "production_run_id",
        "material_id",
        "material_batch_id",
        "timestamp",
        "source_id",
    ):
        enriched.setdefault(key, None)
    enriched.setdefault("payload", {})
    return enriched


DEFAULT_CONNECTED_SOURCES = (
    ("machine_data", "Machine process data", "machine_process", 0.92, 0.98, 0.95),
    ("machine_state", "Machine state", "machine_state", 0.95, 0.98, 0.96),
    ("live_sensors", "Live sensors", "machine_process", 0.90, 0.97, 0.94),
    ("production_history", "Production history", "production_order", 0.70, 0.85, 0.80),
)

DEFAULT_MISSING_SOURCES = (
    ("ai_server", "AI Server", "infrastructure"),
    ("quality_data", "Quality data", "quality"),
    ("maintenance_history", "Maintenance history", "maintenance"),
    ("material_batches", "Material batches", "material"),
    ("energy_data", "Energy data", "energy"),
    ("operator_events", "Operator events", "operator_events"),
    ("opc_ua", "OPC-UA", "machine_process"),
    ("erp", "ERP", "erp"),
    ("models_validated", "Validated models", "models_validated"),
)

DEFAULT_FEATURES = (
    {
        "feature_key": "quality_degradation_prediction",
        "name": "Quality Degradation Prediction",
        "description": "Earlier detection of quality deterioration",
        "required_sources": ["quality_data"],
        "recommended_sources": ["material_batches", "operator_events"],
        "minimum_history_days": 30,
    },
    {
        "feature_key": "remaining_useful_life",
        "name": "Remaining Useful Life",
        "description": "Better maintenance planning",
        "required_sources": ["maintenance_history"],
        "recommended_sources": ["operator_events"],
        "minimum_history_days": 60,
    },
    {
        "feature_key": "material_behaviour_analysis",
        "name": "Material Behaviour Analysis",
        "description": "Comparison of material batches",
        "required_sources": ["material_batches"],
        "recommended_sources": ["quality_data"],
        "minimum_history_days": 30,
    },
    {
        "feature_key": "energy_optimization",
        "name": "Energy Optimization",
        "description": "Lower energy cost per kilogram produced",
        "required_sources": ["energy_data"],
        "recommended_sources": ["material_batches"],
        "minimum_history_days": 30,
    },
    {
        "feature_key": "scrap_prediction",
        "name": "Scrap Prediction",
        "description": "Fewer rejected batches",
        "required_sources": ["quality_data", "material_batches"],
        "recommended_sources": ["operator_events"],
        "minimum_history_days": 45,
    },
)


async def bootstrap_company_defaults(
    session: AsyncSession,
    company_id: str = "default",
    *,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Seed registries for a company if empty (or force overwrite of missing keys only).
    Safe for production: never deletes; only inserts missing defaults.
    """
    existing_sources = await list_data_sources(session, company_id)
    existing_keys = {s.source_key for s in existing_sources}
    created_sources = 0

    if force or not existing_sources:
        for source_key, name, category, completeness, freshness, reliability in DEFAULT_CONNECTED_SOURCES:
            if source_key in existing_keys:
                continue
            await upsert_data_source(
                session,
                {
                    "company_id": company_id,
                    "source_key": source_key,
                    "name": name,
                    "category": category,
                    "status": "connected",
                    "connection_type": "system",
                    "completeness_score": completeness,
                    "freshness_score": freshness,
                    "reliability_score": reliability,
                    "validated": True,
                    "fields": [],
                    "settings": {"seeded": True},
                },
            )
            created_sources += 1
            existing_keys.add(source_key)

        for source_key, name, category in DEFAULT_MISSING_SOURCES:
            if source_key in existing_keys:
                continue
            await upsert_data_source(
                session,
                {
                    "company_id": company_id,
                    "source_key": source_key,
                    "name": name,
                    "category": category,
                    "status": "missing",
                    "connection_type": None,
                    "completeness_score": 0.0,
                    "freshness_score": 0.0,
                    "reliability_score": 0.0,
                    "validated": False,
                    "fields": [],
                    "settings": {"seeded": True},
                },
            )
            created_sources += 1
            existing_keys.add(source_key)

    existing_caps = await list_feature_capabilities(session, company_id)
    existing_feature_keys = {c.feature_key for c in existing_caps}
    created_features = 0
    for feature in DEFAULT_FEATURES:
        if feature["feature_key"] in existing_feature_keys:
            continue
        await upsert_feature_capability(
            session,
            {
                "company_id": company_id,
                **feature,
                "validation_required": True,
                "enabled": True,
            },
        )
        created_features += 1

    integrations = await list_machine_integrations(session, company_id)
    created_machines = 0
    if not integrations:
        await upsert_machine_integration(
            session,
            {
                "company_id": company_id,
                "machine_id": "extruder_01",
                "machine_name": "Extruder 1",
                "network_connected": True,
                "process_data_connected": True,
                "state_data_connected": True,
                "quality_linked": False,
                "maintenance_linked": False,
                "material_linked": False,
                "energy_linked": False,
                "integration_score": 42,
            },
        )
        created_machines += 1
        for i in range(2, 21):
            await upsert_machine_integration(
                session,
                {
                    "company_id": company_id,
                    "machine_id": f"machine_{i:02d}",
                    "machine_name": f"Machine {i}",
                    "network_connected": False,
                    "process_data_connected": False,
                    "state_data_connected": False,
                    "quality_linked": False,
                    "maintenance_linked": False,
                    "material_linked": False,
                    "energy_linked": False,
                    "integration_score": 0,
                },
            )
            created_machines += 1

    await session.commit()
    progress = await recompute_progress_and_features(session, company_id=company_id, actor="system:bootstrap")
    return {
        "company_id": company_id,
        "created_sources": created_sources,
        "created_features": created_features,
        "created_machines": created_machines,
        "digitalization_progress": progress.digitalization_progress,
        "prediction_readiness": progress.prediction_readiness,
    }


async def _load_saved_mssql(session: AsyncSession) -> Dict[str, Any]:
    try:
        import json
        from app.services import settings_service

        setting = await settings_service.get_setting(session, "connections.mssql")
        raw = setting.value if setting else None
        if not raw:
            return {}
        if isinstance(raw, dict):
            return dict(raw)
        return dict(json.loads(raw))
    except Exception:  # noqa: BLE001
        return {}
    return {}


def _merge_connection_for_company(
    current: Optional[DataSource],
    connection: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    stored = dict((current.settings_json or {}).get("connection") or {}) if current else {}
    return {**stored, **(connection or {})}


async def activate_data_source(
    session: AsyncSession,
    *,
    company_id: str,
    source_key: str,
    actor: Optional[str] = None,
    require_import: bool = True,
) -> DataSource:
    """Mark a source connected and refresh capability/progress."""
    existing = await list_data_sources(session, company_id)
    current = next((s for s in existing if s.source_key == source_key), None)
    settings = dict(current.settings_json or {}) if current else {}
    last_import_rows = int(settings.get("last_import_rows") or 0)
    last_value_source = str(settings.get("last_import_value_source") or "")
    if require_import and last_import_rows <= 0:
        raise ValueError(
            "Cannot activate: no historical rows imported yet. Run Import history first."
        )
    if require_import and last_value_source.upper() == "DERIVED":
        raise ValueError(
            "Cannot activate: last import was DERIVED/demo. Configure a real CSV/SQL/API connector."
        )

    payload = {
        "company_id": company_id,
        "source_key": source_key,
        "name": current.name if current else source_key.replace("_", " ").title(),
        "category": current.category if current else source_key,
        "status": "connected",
        "validated": True,
        "completeness_score": max(0.85, current.completeness_score if current else 0.85),
        "freshness_score": max(0.90, current.freshness_score if current else 0.90),
        "reliability_score": max(0.88, current.reliability_score if current else 0.88),
        "connection_type": (current.connection_type if current and current.connection_type else "manual"),
        "fields": list(current.fields_json or []) if current else [],
        "settings": {**settings, "activated_by": actor},
    }
    row = await upsert_data_source(session, payload)

    # Sync machine integration flags when known domains connect
    integrations = await list_machine_integrations(session, company_id)
    for mi in integrations:
        changed = False
        if source_key == "quality_data" and not mi.quality_linked:
            mi.quality_linked = True
            changed = True
        if source_key == "maintenance_history" and not mi.maintenance_linked:
            mi.maintenance_linked = True
            changed = True
        if source_key == "material_batches" and not mi.material_linked:
            mi.material_linked = True
            changed = True
        if source_key == "energy_data" and not mi.energy_linked:
            mi.energy_linked = True
            changed = True
        if changed:
            mi.integration_score = _machine_integration_score(mi)

    await record_progress_event(
        session,
        company_id=company_id,
        event_type="DATA_SOURCE_CONNECTED",
        source=source_key,
        actor=actor,
    )
    await session.commit()
    await recompute_progress_and_features(session, company_id=company_id, actor=actor)
    return row


async def build_setup_wizard_preview(
    session: AsyncSession,
    *,
    company_id: str = "default",
    source_key: str,
    source_type: str,
    field_mapping: Dict[str, str],
    preview_rows: int = 5,
    connection: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Preview real connector rows (CSV / SQL / API)."""
    existing = await list_data_sources(session, company_id)
    current = next((s for s in existing if s.source_key == source_key), None)
    merged = _merge_connection_for_company(current, connection)
    saved_mssql = await _load_saved_mssql(session) if (source_type or "").lower() == "sql" else {}
    limit = max(1, min(int(preview_rows or 5), 50))
    try:
        columns, rows, value_source = await fetch_connector_rows(
            source_type=source_type,
            connection=merged,
            field_mapping=field_mapping or {},
            saved_mssql=saved_mssql,
            limit=limit,
            history_days=None,
        )
        return {
            "source_key": source_key,
            "source_type": source_type,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "value_source": value_source,
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "source_key": source_key,
            "source_type": source_type,
            "columns": list(field_mapping.keys()) if field_mapping else [],
            "rows": [],
            "row_count": 0,
            "value_source": "LIVE",
            "error": str(exc),
        }


async def assess_setup_wizard_quality(
    session: AsyncSession,
    *,
    company_id: str,
    source_key: str,
    source_type: str,
    field_mapping: Dict[str, str],
    connection: Optional[Dict[str, Any]] = None,
    sample_rows: int = 200,
) -> DataQualitySnapshot:
    """Sample connector data and persist a real quality snapshot."""
    existing = await list_data_sources(session, company_id)
    current = next((s for s in existing if s.source_key == source_key), None)
    stored_conn = dict((current.settings_json or {}).get("connection") or {}) if current else {}
    merged = {**stored_conn, **(connection or {})}
    saved_mssql = await _load_saved_mssql(session) if (source_type or "").lower() == "sql" else {}

    _, rows, _ = await fetch_connector_rows(
        source_type=source_type,
        connection=merged,
        field_mapping=field_mapping or {},
        saved_mssql=saved_mssql,
        limit=max(10, min(int(sample_rows or 200), 1000)),
        history_days=None,
    )
    ratios = quality_ratios_from_rows(rows, field_mapping or {})
    input_row = DataQualityInput(
        company_id=company_id,
        source_key=source_key,
        **ratios,
    )
    return await save_data_quality_snapshot(session, input_row)


async def import_setup_wizard_history(
    session: AsyncSession,
    *,
    company_id: str,
    source_key: str,
    import_history_days: int,
    field_mapping: Dict[str, str],
    actor: Optional[str] = None,
    connection: Optional[Dict[str, Any]] = None,
    source_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch real connector history and persist into source_import_rows."""
    existing = await list_data_sources(session, company_id)
    current = next((s for s in existing if s.source_key == source_key), None)
    settings = dict(current.settings_json or {}) if current else {}
    st = (
        source_type
        or settings.get("source_type")
        or (current.connection_type if current else None)
        or "csv"
    )
    stored_conn = dict(settings.get("connection") or {})
    merged = {**stored_conn, **(connection or {})}
    saved_mssql = await _load_saved_mssql(session) if str(st).lower() == "sql" else {}

    try:
        _columns, rows, value_source = await fetch_connector_rows(
            source_type=str(st),
            connection=merged,
            field_mapping=field_mapping or settings.get("field_mapping") or {},
            saved_mssql=saved_mssql,
            limit=None,
            history_days=max(1, int(import_history_days or 30)),
        )
    except Exception as exc:  # noqa: BLE001
        return {
            "source_key": source_key,
            "imported_rows": 0,
            "import_history_days": import_history_days,
            "status": "failed",
            "value_source": "LIVE",
            "import_batch_id": None,
            "error": str(exc),
        }

    batch_id = uuid4().hex[:16]
    # Cap write volume for Mini-PC safety
    max_rows = 20_000
    to_write = rows[:max_rows]
    for mapped in to_write:
        ts_str, machine_id = extract_row_meta(mapped)
        session.add(
            SourceImportRow(
                company_id=company_id,
                source_key=source_key,
                source_type=str(st),
                value_source=value_source,
                row_timestamp=ts_str,
                machine_id=machine_id,
                payload_json=mapped,
                import_batch_id=batch_id,
            )
        )

    # Promote staged rows into operational domain sinks (non-AI/ML)
    from app.services import domain_import_sink_service as domain_sink

    domain_promote = await domain_sink.promote_import_batch_to_domain(
        session,
        company_id=company_id,
        source_key=source_key,
        import_batch_id=batch_id,
        rows=to_write,
    )

    imported_rows = len(to_write)
    settings.update(
        {
            "field_mapping": field_mapping or settings.get("field_mapping") or {},
            "import_history_days": import_history_days,
            "last_import_rows": imported_rows,
            "last_import_by": actor,
            "last_import_value_source": value_source,
            "last_import_batch_id": batch_id,
            "last_domain_promote": domain_promote,
            "connection": merged,
            "source_type": st,
        }
    )
    await upsert_data_source(
        session,
        {
            "company_id": company_id,
            "source_key": source_key,
            "name": current.name if current else source_key.replace("_", " ").title(),
            "category": current.category if current else source_key,
            "status": current.status if current else "setup_required",
            "connection_type": st,
            "fields": list((field_mapping or {}).keys())
            or (list(current.fields_json or []) if current else []),
            "settings": settings,
            "completeness_score": current.completeness_score if current else 0.7,
            "freshness_score": current.freshness_score if current else 0.7,
            "reliability_score": current.reliability_score if current else 0.7,
            "validated": False,
        },
    )
    await record_progress_event(
        session,
        company_id=company_id,
        event_type="HISTORICAL_DATA_IMPORTED",
        source=source_key,
        actor=actor,
        details={
            "imported_rows": imported_rows,
            "import_history_days": import_history_days,
            "value_source": value_source,
            "import_batch_id": batch_id,
            "domain_promote": domain_promote,
        },
    )
    await session.commit()
    return {
        "source_key": source_key,
        "imported_rows": imported_rows,
        "import_history_days": import_history_days,
        "status": "imported" if imported_rows > 0 else "empty",
        "value_source": value_source,
        "import_batch_id": batch_id,
        "error": None if imported_rows > 0 else "Connector returned 0 rows in the selected window",
        "domain_table": domain_promote.get("domain_table"),
        "domain_rows": int(domain_promote.get("domain_rows") or 0),
        "quality_records_linked": int(domain_promote.get("quality_records_linked") or 0),
        "domain_promote": domain_promote,
    }

