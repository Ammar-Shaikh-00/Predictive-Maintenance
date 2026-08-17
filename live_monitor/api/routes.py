"""FastAPI routes — debug/local API reading live data from backend Postgres."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI, HTTPException

import config
from evaluation.findings_builder import build_findings, build_prediction_risks
from ml.model_registry import MODEL_REGISTRY
from storage.backend_client import BackendClient

app = FastAPI(title="Live Evaluation API", version="2.2.0")
_client = BackendClient()


def _latest_window() -> dict:
    rows = _client.list_live_process_windows(limit=1, offset=0)
    if not rows:
        raise HTTPException(status_code=404, detail="No window data yet (Postgres)")
    return rows[0]


def _latest_evaluation() -> dict:
    rows = _client.list_live_run_evaluations(limit=1, offset=0)
    if not rows:
        raise HTTPException(status_code=404, detail="No evaluation data yet (Postgres)")
    return rows[0]


@app.get("/live/current-window")
def get_current_window():
    row = _latest_window()
    return {
        "id": row.get("id"),
        "window_start": row.get("window_start"),
        "window_end": row.get("window_end"),
        "candidate_state": row.get("candidate_state"),
        "confirmed_state": row.get("confirmed_state"),
        "confirmation_count": row.get("confirmation_count"),
        "avg_pressure": row.get("avg_pressure"),
        "avg_speed": row.get("avg_speed"),
        "avg_temp": row.get("avg_temp"),
        "avg_load": row.get("avg_load"),
        "pressure_per_rpm": row.get("pressure_per_rpm"),
        "temp_spread": row.get("temp_spread"),
        "load_per_pressure": row.get("load_per_pressure"),
        "row_count": row.get("row_count"),
        "valid_fraction": row.get("valid_fraction"),
        "invalid_fraction": row.get("invalid_fraction"),
        "created_at": row.get("created_at"),
        "source": "postgres",
    }


@app.get("/live/current-evaluation")
def get_current_evaluation():
    row = _latest_evaluation()
    return {
        "id": row.get("id"),
        "live_process_window_id": row.get("live_process_window_id"),
        "detected_state": row.get("detected_state"),
        "active_regime": row.get("active_regime"),
        "baseline_selection_method": row.get("baseline_selection_method"),
        "evaluation_status": row.get("evaluation_status"),
        "overall_status": row.get("overall_status"),
        "stability_status": row.get("stability_status"),
        "drift_score": row.get("drift_score"),
        "anomaly_score": row.get("anomaly_score"),
        "explanation_text": row.get("explanation_text"),
        "ml_anomaly_score": row.get("ml_anomaly_score"),
        "ml_is_anomaly": row.get("ml_is_anomaly"),
        "ml_model_status": row.get("ml_model_status"),
        "created_at": row.get("created_at"),
        "source": "postgres",
    }


@app.get("/live/current-feature-evaluation")
def get_current_feature_evaluation():
    latest_run = _latest_evaluation()
    run_id = latest_run.get("id")
    rows = _client.list_live_feature_evaluations(
        limit=100,
        offset=0,
        live_run_evaluation_id=run_id,
    )
    return {
        "live_run_evaluation_id": run_id,
        "overall_status": latest_run.get("overall_status"),
        "source": "postgres",
        "features": [
            {
                "feature_name": r.get("feature_name"),
                "current_value": r.get("current_value"),
                "baseline_mean": r.get("baseline_mean"),
                "baseline_std": r.get("baseline_std"),
                "deviation_abs": r.get("deviation_abs"),
                "deviation_pct": r.get("deviation_pct"),
                "z_score": r.get("z_score"),
                "feature_status": r.get("feature_status"),
                "baseline_warning_low": r.get("baseline_warning_low"),
                "baseline_warning_high": r.get("baseline_warning_high"),
                "baseline_critical_low": r.get("baseline_critical_low"),
                "baseline_critical_high": r.get("baseline_critical_high"),
            }
            for r in rows
        ],
    }


@app.get("/live/current-findings")
def get_current_findings():
    """Structured findings + prediction risks rebuilt from latest Postgres eval rows."""
    latest_run = _latest_evaluation()
    run_id = latest_run.get("id")
    feature_rows = _client.list_live_feature_evaluations(
        limit=100,
        offset=0,
        live_run_evaluation_id=run_id,
    )
    feature_results = [SimpleNamespace(**r) for r in feature_rows if isinstance(r, dict)]
    ml_result = {
        "ml_anomaly_score": latest_run.get("ml_anomaly_score"),
        "ml_is_anomaly": latest_run.get("ml_is_anomaly"),
        "ml_model_status": latest_run.get("ml_model_status"),
    }
    findings = build_findings(
        confirmed_state=latest_run.get("detected_state"),
        overall_status=latest_run.get("overall_status"),
        stability_status=latest_run.get("stability_status"),
        feature_results=feature_results,
        ml_result=ml_result,
        drift_result={
            "drift_detected": bool((latest_run.get("drift_score") or 0) >= 0.6),
            "drifting_features": [],
            "drift_details": {},
        },
        baseline_result={
            "active_regime": latest_run.get("active_regime"),
            "baseline_selection_method": latest_run.get("baseline_selection_method"),
        },
    )
    predictions = build_prediction_risks(findings)
    return {
        "live_run_evaluation_id": run_id,
        "explanation_text": latest_run.get("explanation_text"),
        "overall_status": latest_run.get("overall_status"),
        "findings": findings,
        "predictions": predictions,
        "source": "postgres",
    }


@app.get("/baseline/registry")
def get_baseline_registry():
    rows = _client.get_baseline_registry(limit=1000)
    return {
        "total": len(rows),
        "source": "postgres",
        "baselines": [
            {
                "id": r.get("id"),
                "regime_type": r.get("regime_type"),
                "feature_name": r.get("feature_name"),
                "mean_value": r.get("mean_value"),
                "std_value": r.get("std_value"),
                "warning_low": r.get("warning_low"),
                "warning_high": r.get("warning_high"),
                "critical_low": r.get("critical_low"),
                "critical_high": r.get("critical_high"),
                "baseline_confidence": r.get("baseline_confidence"),
                "source_run_count": r.get("source_run_count"),
            }
            for r in rows
        ],
    }


@app.get("/ml/current-anomaly")
def get_current_ml_anomaly():
    row = _latest_evaluation()
    return {
        "id": row.get("id"),
        "live_process_window_id": row.get("live_process_window_id"),
        "detected_state": row.get("detected_state"),
        "ml_anomaly_score": row.get("ml_anomaly_score"),
        "ml_is_anomaly": row.get("ml_is_anomaly"),
        "ml_model_status": row.get("ml_model_status"),
        "overall_status": row.get("overall_status"),
        "drift_score": row.get("drift_score"),
        "anomaly_score": row.get("anomaly_score"),
        "explanation_text": row.get("explanation_text"),
        "created_at": row.get("created_at"),
        "source": "postgres",
    }


@app.get("/ml/model-status")
def get_ml_model_status():
    models = []
    for state, entry in MODEL_REGISTRY.items():
        model_path = entry.get("model_path")
        scaler_path = entry.get("scaler_path")
        model_exists = bool(
            model_path
            and scaler_path
            and os.path.isfile(model_path)
            and os.path.isfile(scaler_path)
        )
        models.append(
            {
                "state": state,
                "status": entry["status"],
                "model_exists": model_exists,
                "min_samples": entry["min_samples"],
            }
        )
    return {"models": models}


@app.get("/ml/recent-evaluations")
def get_recent_ml_evaluations():
    rows = _client.list_live_run_evaluations(limit=20, offset=0)
    return [
        {
            "id": row.get("id"),
            "detected_state": row.get("detected_state"),
            "overall_status": row.get("overall_status"),
            "ml_anomaly_score": row.get("ml_anomaly_score"),
            "ml_is_anomaly": row.get("ml_is_anomaly"),
            "ml_model_status": row.get("ml_model_status"),
            "explanation_text": row.get("explanation_text"),
            "created_at": row.get("created_at"),
            "source": "postgres",
        }
        for row in rows
    ]


@app.get("/ml/drift-status")
def get_ml_drift_status():
    row = _latest_evaluation()
    return {
        "detected_state": row.get("detected_state"),
        "overall_status": row.get("overall_status"),
        "drift_score": row.get("drift_score"),
        "explanation_text": row.get("explanation_text"),
        "ml_anomaly_score": row.get("ml_anomaly_score"),
        "ml_is_anomaly": row.get("ml_is_anomaly"),
        "created_at": row.get("created_at"),
        "source": "postgres",
    }


@app.post("/ml/trigger-retrain")
def trigger_retrain():
    """Disabled — training must run on a PC, not inside live-monitor Docker."""
    raise HTTPException(
        status_code=403,
        detail=(
            "Retrain is disabled in live-monitor (inference only). "
            "On your PC run: python run_retrain.py "
            "Then copy new .pkl files into ml_data/ and call POST /ml/reload-models."
        ),
    )


@app.post("/ml/reload-models")
def reload_models():
    """Reload anomaly + state .pkl from disk after offline retrain / file copy."""
    try:
        import main as pipeline_main
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Pipeline not loaded — start live_monitor/main.py first",
        ) from exc

    errors: list[str] = []
    try:
        pipeline_main.anomaly_scorer._load_all_models()
    except Exception as exc:
        logging.exception("Anomaly model reload failed")
        errors.append(f"anomaly: {exc}")

    state_ok = False
    if hasattr(pipeline_main.detector, "reload_models"):
        try:
            state_ok = bool(pipeline_main.detector.reload_models())
        except Exception as exc:
            logging.exception("State classifier reload failed")
            errors.append(f"state: {exc}")

    if errors and not pipeline_main.anomaly_scorer.models and not state_ok:
        raise HTTPException(
            status_code=500,
            detail="; ".join(errors) or "Failed to reload models from ml_data/",
        )

    return {
        "status": "reloaded",
        "anomaly_models": sorted(pipeline_main.anomaly_scorer.models.keys()),
        "state_classifier_reloaded": state_ok,
        "warnings": errors,
        "message": "Loaded .pkl from disk; no training was run",
    }


def _ml_models_loaded() -> list[str]:
    try:
        import main as pipeline_main

        return sorted(pipeline_main.anomaly_scorer.models.keys())
    except (ImportError, AttributeError):
        pass
    loaded: list[str] = []
    for state, entry in MODEL_REGISTRY.items():
        model_path = entry.get("model_path")
        scaler_path = entry.get("scaler_path")
        if (
            model_path
            and scaler_path
            and os.path.isfile(model_path)
            and os.path.isfile(scaler_path)
        ):
            loaded.append(state)
    return sorted(loaded)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow(),
        "pipeline_version": "2.2",
        "persistence": "postgres",
        "backend_base_url": config.BACKEND_BASE_URL,
        "ml_models_loaded": _ml_models_loaded(),
        "layer1_status": "active",
        "layer2_status": "active",
        "scheduler_status": "disabled",
        "retrain_mode": "external_pc_only",
    }
