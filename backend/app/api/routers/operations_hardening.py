from typing import Any, Dict, List, Optional
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_session, get_current_user
from app.models.user import User
from app.schemas.operations_hardening import (
    DataQualityInput,
    DataQualitySnapshotRead,
    DataSourceRead,
    DataSourceUpsert,
    FeatureCapabilityRead,
    FeatureCapabilityUpsert,
    FeatureStatusRead,
    HardeningOverview,
    MachineIntegrationRead,
    MachineIntegrationUpsert,
    NormalizeSignalRequest,
    NormalizeSignalResponse,
    ProgressEventRead,
    SetupWizardAssessQualityRequest,
    SetupWizardDraft,
    SetupWizardImportRequest,
    SetupWizardImportResponse,
    SetupWizardPreviewRequest,
    SetupWizardPreviewResponse,
    SetupWizardResult,
    TimelineRecordIn,
)
from app.services import operations_hardening_service as service

router = APIRouter(prefix="/operations-hardening", tags=["operations-hardening"])

UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "uploads" / "connectors"


@router.post("/data-sources", response_model=DataSourceRead)
async def upsert_data_source(
    payload: DataSourceUpsert,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    row = await service.upsert_data_source(session, payload.model_dump())
    await session.commit()
    await session.refresh(row)
    return DataSourceRead.model_validate(
        {
            **row.__dict__,
            "fields": row.fields_json,
            "settings": row.settings_json,
        }
    )


@router.get("/data-sources", response_model=List[DataSourceRead])
async def list_data_sources(
    company_id: str = "default",
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = await service.list_data_sources(session, company_id)
    return [
        DataSourceRead.model_validate(
            {
                **r.__dict__,
                "fields": r.fields_json,
                "settings": r.settings_json,
            }
        )
        for r in rows
    ]


@router.post("/machine-integrations", response_model=MachineIntegrationRead)
async def upsert_machine_integration(
    payload: MachineIntegrationUpsert,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    row = await service.upsert_machine_integration(session, payload.model_dump())
    await session.commit()
    await session.refresh(row)
    return MachineIntegrationRead.model_validate(row)


@router.get("/machine-integrations", response_model=List[MachineIntegrationRead])
async def list_machine_integrations(
    company_id: str = "default",
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = await service.list_machine_integrations(session, company_id)
    return [MachineIntegrationRead.model_validate(r) for r in rows]


@router.post("/feature-capabilities", response_model=FeatureCapabilityRead)
async def upsert_feature_capability(
    payload: FeatureCapabilityUpsert,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    row = await service.upsert_feature_capability(session, payload.model_dump())
    await session.commit()
    await session.refresh(row)
    return FeatureCapabilityRead.model_validate(
        {
            **row.__dict__,
            "required_sources": row.required_sources_json,
            "recommended_sources": row.recommended_sources_json,
        }
    )


@router.get("/feature-capabilities", response_model=List[FeatureCapabilityRead])
async def list_feature_capabilities(
    company_id: str = "default",
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = await service.list_feature_capabilities(session, company_id)
    return [
        FeatureCapabilityRead.model_validate(
            {
                **r.__dict__,
                "required_sources": r.required_sources_json,
                "recommended_sources": r.recommended_sources_json,
            }
        )
        for r in rows
    ]


@router.post("/bootstrap")
async def bootstrap_defaults(
    company_id: str = "default",
    force: bool = False,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed default data sources, features, and machine integrations if empty."""
    result = await service.bootstrap_company_defaults(
        session, company_id=company_id, force=force
    )
    overview = await _build_overview(session, company_id)
    return {"bootstrap": result, "overview": overview}


@router.post("/recompute", response_model=HardeningOverview)
async def recompute_hardening_state(
    company_id: str = "default",
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    await service.recompute_progress_and_features(session, company_id=company_id, actor=current_user.email)
    return await _build_overview(session, company_id)


@router.get("/overview", response_model=HardeningOverview)
async def get_hardening_overview(
    company_id: str = "default",
    bootstrap_if_empty: bool = True,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if bootstrap_if_empty:
        sources = await service.list_data_sources(session, company_id)
        if not sources:
            await service.bootstrap_company_defaults(session, company_id=company_id)
    return await _build_overview(session, company_id)


@router.post("/data-quality", response_model=DataQualitySnapshotRead)
async def upsert_data_quality(
    payload: DataQualityInput,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    row = await service.save_data_quality_snapshot(session, payload)
    return DataQualitySnapshotRead.model_validate(
        {
            **row.__dict__,
            "issues": row.issues_json,
        }
    )


@router.post("/setup-wizard/start", response_model=SetupWizardResult)
async def setup_wizard_start(
    payload: SetupWizardDraft,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    existing = await service.list_data_sources(session, payload.company_id)
    current = next((s for s in existing if s.source_key == payload.source_key), None)
    prev_settings = dict(current.settings_json or {}) if current else {}
    connection = {**(prev_settings.get("connection") or {}), **(payload.connection or {})}
    source = await service.upsert_data_source(
        session,
        {
            "company_id": payload.company_id,
            "source_key": payload.source_key,
            "name": current.name if current else payload.source_key.replace("_", " ").title(),
            "category": current.category if current else payload.source_key,
            "status": "setup_required",
            "connection_type": payload.source_type,
            "fields": list(payload.field_mapping.keys()),
            "settings": {
                **prev_settings,
                "field_mapping": payload.field_mapping,
                "import_history_days": payload.import_history_days,
                "preview_rows": payload.preview_rows,
                "setup_started_by": current_user.email,
                "source_type": payload.source_type,
                "connection": connection,
            },
            "completeness_score": current.completeness_score if current else 0.0,
            "freshness_score": current.freshness_score if current else 0.0,
            "reliability_score": current.reliability_score if current else 0.0,
            "validated": False,
        },
    )
    await service.record_progress_event(
        session,
        company_id=payload.company_id,
        event_type="SETUP_WIZARD_STARTED",
        source=payload.source_key,
        actor=current_user.email,
        details={"source_type": payload.source_type},
    )
    await session.commit()
    await session.refresh(source)
    return SetupWizardResult(
        source_key=payload.source_key,
        activated=False,
        steps_completed=[
            "source_selected",
            "field_mapping_saved",
            "preview_configured",
        ],
        next_steps=[
            "run_data_quality_check",
            "import_historical_data",
            "activate_source",
        ],
    )


@router.post("/setup-wizard/upload-csv")
async def setup_wizard_upload_csv(
    company_id: str = Form("default"),
    source_key: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Persist a CSV upload for the connector and attach path to data_sources.settings."""
    name = (file.filename or "upload.csv").lower()
    if not (name.endswith(".csv") or name.endswith(".txt") or name.endswith(".tsv")):
        raise HTTPException(status_code=400, detail="Only CSV/TXT/TSV uploads are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")

    dest_dir = UPLOAD_ROOT / company_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{source_key}_{uuid4().hex[:8]}.csv"
    dest.write_bytes(content)

    existing = await service.list_data_sources(session, company_id)
    current = next((s for s in existing if s.source_key == source_key), None)
    settings = dict(current.settings_json or {}) if current else {}
    connection = dict(settings.get("connection") or {})
    connection["file_path"] = str(dest)
    connection["upload_path"] = str(dest)
    connection["original_filename"] = file.filename
    settings["connection"] = connection
    settings["source_type"] = settings.get("source_type") or "csv"

    await service.upsert_data_source(
        session,
        {
            "company_id": company_id,
            "source_key": source_key,
            "name": current.name if current else source_key.replace("_", " ").title(),
            "category": current.category if current else source_key,
            "status": current.status if current else "setup_required",
            "connection_type": current.connection_type if current else "csv",
            "fields": list(current.fields_json or []) if current else [],
            "settings": settings,
            "completeness_score": current.completeness_score if current else 0.0,
            "freshness_score": current.freshness_score if current else 0.0,
            "reliability_score": current.reliability_score if current else 0.0,
            "validated": False,
        },
    )
    await session.commit()
    return {
        "ok": True,
        "source_key": source_key,
        "file_path": str(dest),
        "bytes": len(content),
        "uploaded_by": current_user.email,
    }


@router.post("/setup-wizard/preview", response_model=SetupWizardPreviewResponse)
async def setup_wizard_preview(
    payload: SetupWizardPreviewRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    preview = await service.build_setup_wizard_preview(
        session,
        company_id=payload.company_id,
        source_key=payload.source_key,
        source_type=payload.source_type,
        field_mapping=payload.field_mapping,
        preview_rows=payload.preview_rows,
        connection=payload.connection,
    )
    if preview.get("error") and not preview.get("rows"):
        raise HTTPException(status_code=400, detail=preview["error"])
    return SetupWizardPreviewResponse.model_validate(preview)


@router.post("/setup-wizard/assess-quality", response_model=DataQualitySnapshotRead)
async def setup_wizard_assess_quality(
    payload: SetupWizardAssessQualityRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        row = await service.assess_setup_wizard_quality(
            session,
            company_id=payload.company_id,
            source_key=payload.source_key,
            source_type=payload.source_type,
            field_mapping=payload.field_mapping,
            connection=payload.connection,
            sample_rows=payload.sample_rows,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DataQualitySnapshotRead.model_validate(
        {
            **row.__dict__,
            "issues": row.issues_json,
        }
    )


@router.post("/setup-wizard/import", response_model=SetupWizardImportResponse)
async def setup_wizard_import(
    payload: SetupWizardImportRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await service.import_setup_wizard_history(
        session,
        company_id=payload.company_id,
        source_key=payload.source_key,
        import_history_days=payload.import_history_days,
        field_mapping=payload.field_mapping,
        actor=current_user.email,
        connection=payload.connection,
        source_type=payload.source_type,
    )
    if result.get("status") == "failed":
        raise HTTPException(status_code=400, detail=result.get("error") or "Import failed")
    return SetupWizardImportResponse.model_validate(result)


@router.post("/setup-wizard/activate/{source_key}", response_model=SetupWizardResult)
async def setup_wizard_activate(
    source_key: str,
    company_id: str = "default",
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        await service.activate_data_source(
            session,
            company_id=company_id,
            source_key=source_key,
            actor=current_user.email,
            require_import=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SetupWizardResult(
        source_key=source_key,
        activated=True,
        steps_completed=[
            "source_selected",
            "field_mapping_saved",
            "data_quality_checked",
            "historical_data_imported",
            "activated",
        ],
        next_steps=["feature_status_recomputed", "monitor_source_health"],
        message=f"{source_key} activated from real connector import",
    )


@router.post("/normalize", response_model=NormalizeSignalResponse)
async def normalize_signal(
    payload: NormalizeSignalRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    canonical, source = await service.normalize_signal_key(
        session,
        machine_type=payload.machine_type,
        raw_key=payload.raw_key,
        canonical_key=payload.canonical_key,
        unit=payload.unit,
    )
    return NormalizeSignalResponse(
        machine_type=payload.machine_type,
        raw_key=payload.raw_key,
        canonical_key=canonical,
        source=source,
    )


@router.post("/timeline/enrich", response_model=Dict[str, Any])
async def enrich_timeline_record(
    payload: TimelineRecordIn,
    current_user: User = Depends(get_current_user),
):
    return service.enrich_timeline_record(payload.model_dump())


async def _build_overview(session: AsyncSession, company_id: str) -> HardeningOverview:
    from app.services import prediction_readiness_service as ml_readiness

    progress = await service.get_or_build_progress(session, company_id)
    feature_status_rows = await service.list_feature_status(session, company_id)
    events = await service.list_progress_events(session, company_id, limit=20)
    ml_avg = await ml_readiness.get_company_prediction_readiness_average(
        session, company_id=company_id
    )

    feature_status = [
        FeatureStatusRead.model_validate(
            {
                **fs.__dict__,
                "missing_sources": fs.missing_sources_json,
                "notes": fs.notes_json,
            }
        )
        for fs in feature_status_rows
    ]
    recent_progress_events = [
        ProgressEventRead.model_validate(
            {
                **ev.__dict__,
                "details": ev.details_json,
            }
        )
        for ev in events
    ]

    return HardeningOverview(
        company_id=company_id,
        digitalization_progress=progress.digitalization_progress,
        prediction_readiness=float(ml_avg) if ml_avg is not None else 0.0,
        data_quality_score=progress.data_quality_score,
        connected_machines=progress.connected_machines,
        total_machines=progress.total_machines,
        connected_sources=list(progress.connected_sources_json or []),
        missing_sources=list(progress.missing_sources_json or []),
        feature_status=feature_status,
        recent_progress_events=recent_progress_events,
    )


@router.get("/domain-imports/summary")
async def domain_imports_summary(
    company_id: str = "default",
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Counts of rows promoted into operational domain sinks (non-AI/ML)."""
    from app.services import domain_import_sink_service as domain_sink

    counts = await domain_sink.domain_import_summary(session, company_id=company_id)
    return {"company_id": company_id, **counts}


@router.get("/domain-imports/maintenance")
async def domain_imports_maintenance(
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.services import domain_import_sink_service as domain_sink

    rows = await domain_sink.list_maintenance_events(
        session, company_id=company_id, limit=limit, offset=offset
    )
    return {"company_id": company_id, "count": len(rows), "rows": rows}


@router.get("/domain-imports/energy")
async def domain_imports_energy(
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.services import domain_import_sink_service as domain_sink

    rows = await domain_sink.list_energy_readings(
        session, company_id=company_id, limit=limit, offset=offset
    )
    return {"company_id": company_id, "count": len(rows), "rows": rows}


@router.get("/domain-imports/quality")
async def domain_imports_quality(
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.services import domain_import_sink_service as domain_sink

    rows = await domain_sink.list_quality_events(
        session, company_id=company_id, limit=limit, offset=offset
    )
    return {"company_id": company_id, "count": len(rows), "rows": rows}


@router.get("/domain-imports/material")
async def domain_imports_material(
    company_id: str = "default",
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.services import domain_import_sink_service as domain_sink

    rows = await domain_sink.list_material_batches(
        session, company_id=company_id, limit=limit, offset=offset
    )
    return {"company_id": company_id, "count": len(rows), "rows": rows}

