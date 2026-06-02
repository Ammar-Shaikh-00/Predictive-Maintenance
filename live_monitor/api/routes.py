# FastAPI routes — exposes live evaluation data for UI and reporting
#               runs as a background service alongside the main pipeline loop
#               anyone can call these URLs to get latest evaluation results

import os
import threading
from datetime import datetime

from fastapi import FastAPI, HTTPException
from sqlalchemy.orm import Session

import config
from ml.model_registry import MODEL_REGISTRY
from ml.retrain_scheduler import run_retraining
from storage.db_writer import (
    BaselineRegistry,
    LiveFeatureEvaluation,
    LiveProcessWindow,
    LiveRunEvaluation,
    engine,
)

app = FastAPI(title="Live Evaluation API", version="1.0.0")
# single FastAPI app instance shared across all routes


# returns latest live process window with all calculated features
# UI uses this to show current sensor readings
@app.get("/live/current-window")
def get_current_window():
    with Session(engine) as session:
        row = session.query(LiveProcessWindow).order_by(LiveProcessWindow.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="No window data yet")
        return {
            "id": row.id,
            "window_start": row.window_start,
            "window_end": row.window_end,
            "candidate_state": row.candidate_state,
            "confirmed_state": row.confirmed_state,
            "confirmation_count": row.confirmation_count,
            "avg_pressure": row.avg_pressure,
            "avg_speed": row.avg_speed,
            "avg_temp": row.avg_temp,
            "avg_load": row.avg_load,
            "pressure_per_rpm": row.pressure_per_rpm,
            "temp_spread": row.temp_spread,
            "load_per_pressure": row.load_per_pressure,
            "row_count": row.row_count,
            "created_at": row.created_at,
        }


# returns latest overall evaluation result
# main endpoint for UI status display (NORMAL/WARNING/CRITICAL)
@app.get("/live/current-evaluation")
def get_current_evaluation():
    with Session(engine) as session:
        row = session.query(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="No evaluation data yet")
        return {
            "id": row.id,
            "live_process_window_id": row.live_process_window_id,
            "detected_state": row.detected_state,
            "active_regime": row.active_regime,
            "baseline_selection_method": row.baseline_selection_method,
            "evaluation_status": row.evaluation_status,
            "overall_status": row.overall_status,
            "stability_status": row.stability_status,
            "drift_score": row.drift_score,
            "anomaly_score": row.anomaly_score,
            "explanation_text": row.explanation_text,
            "ml_anomaly_score": row.ml_anomaly_score,
            "ml_is_anomaly": row.ml_is_anomaly,
            "ml_model_status": row.ml_model_status,
            "created_at": row.created_at,
        }


# returns per-feature breakdown for latest evaluated window
# UI uses this to show which features are normal/warning/critical
@app.get("/live/current-feature-evaluation")
def get_current_feature_evaluation():
    with Session(engine) as session:
        latest_run = session.query(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc()).first()
        if not latest_run:
            raise HTTPException(status_code=404, detail="No evaluation data yet")

        rows = session.query(LiveFeatureEvaluation).filter(
            LiveFeatureEvaluation.live_run_evaluation_id == latest_run.id
        ).all()

        return {
            "live_run_evaluation_id": latest_run.id,
            "overall_status": latest_run.overall_status,
            "features": [
                {
                    "feature_name": r.feature_name,
                    "current_value": r.current_value,
                    "baseline_mean": r.baseline_mean,
                    "baseline_std": r.baseline_std,
                    "deviation_abs": r.deviation_abs,
                    "deviation_pct": r.deviation_pct,
                    "z_score": r.z_score,
                    "feature_status": r.feature_status,
                    "baseline_warning_low": r.baseline_warning_low,
                    "baseline_warning_high": r.baseline_warning_high,
                    "baseline_critical_low": r.baseline_critical_low,
                    "baseline_critical_high": r.baseline_critical_high,
                }
                for r in rows
            ],
        }


# returns all 27 baseline entries (LOW + MID + HIGH regimes)
# UI uses this to show what normal looks like per feature
@app.get("/baseline/registry")
def get_baseline_registry():
    with Session(engine) as session:
        rows = session.query(BaselineRegistry).all()
        return {
            "total": len(rows),
            "baselines": [
                {
                    "id": r.id,
                    "regime_type": r.regime_type,
                    "feature_name": r.feature_name,
                    "mean_value": r.mean_value,
                    "std_value": r.std_value,
                    "warning_low": r.warning_low,
                    "warning_high": r.warning_high,
                    "critical_low": r.critical_low,
                    "critical_high": r.critical_high,
                    "baseline_confidence": r.baseline_confidence,
                    "source_run_count": r.source_run_count,
                }
                for r in rows
            ],
        }


# returns latest ML anomaly result for current window
@app.get("/ml/current-anomaly")
def get_current_ml_anomaly():
    with Session(engine) as session:
        row = session.query(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="No evaluation data yet")
        return {
            "id": row.id,
            "live_process_window_id": row.live_process_window_id,
            "detected_state": row.detected_state,
            "ml_anomaly_score": row.ml_anomaly_score,
            "ml_is_anomaly": row.ml_is_anomaly,
            "ml_model_status": row.ml_model_status,
            "overall_status": row.overall_status,
            "drift_score": row.drift_score,
            "anomaly_score": row.anomaly_score,
            "explanation_text": row.explanation_text,
            "created_at": row.created_at,
        }


# returns current status of all ML models
# useful for UI to show which models are ready
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


# returns last 20 evaluations with ML scores
@app.get("/ml/recent-evaluations")
def get_recent_ml_evaluations():
    with Session(engine) as session:
        rows = (
            session.query(LiveRunEvaluation)
            .order_by(LiveRunEvaluation.id.desc())
            .limit(20)
            .all()
        )
        return [
            {
                "id": row.id,
                "detected_state": row.detected_state,
                "overall_status": row.overall_status,
                "ml_anomaly_score": row.ml_anomaly_score,
                "ml_is_anomaly": row.ml_is_anomaly,
                "ml_model_status": row.ml_model_status,
                "created_at": row.created_at,
            }
            for row in rows
        ]


# returns current drift detection result from latest evaluation
@app.get("/ml/drift-status")
def get_ml_drift_status():
    with Session(engine) as session:
        row = session.query(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="No evaluation data yet")
        return {
            "detected_state": row.detected_state,
            "overall_status": row.overall_status,
            "drift_score": row.drift_score,
            "explanation_text": row.explanation_text,
            "ml_anomaly_score": row.ml_anomaly_score,
            "ml_is_anomaly": row.ml_is_anomaly,
            "created_at": row.created_at,
        }


# returns current simulation progress
@app.get("/simulation/status")
def get_simulation_status():
    if not config.SIMULATION_MODE:
        return {"simulation_mode": False}
    import main as pipeline_main

    client = pipeline_main.client
    return {
        "simulation_mode": True,
        "speed": config.SIMULATION_SPEED,
        "progress": client.replay.progress(),
    }


# restart replay from beginning
@app.post("/simulation/reset")
def post_simulation_reset():
    if not config.SIMULATION_MODE:
        return {"error": "not in simulation mode"}
    import main as pipeline_main

    client = pipeline_main.client
    client.replay.reset()
    return {"status": "reset", "message": "replay restarted from row 0"}


# shows what data row is currently being replayed
@app.get("/simulation/current-row")
def get_simulation_current_row():
    if not config.SIMULATION_MODE:
        return {"simulation_mode": False}
    import main as pipeline_main

    client = pipeline_main.client
    progress = client.replay.progress()
    return {
        "current_index": progress["current_index"],
        "total_rows": progress["total_rows"],
        "percent_done": progress["percent"],
    }


# manually trigger ML retraining from API
# useful when new data added or models need refresh
@app.post("/ml/trigger-retrain")
def trigger_retrain():
    import main as pipeline_main

    thread = threading.Thread(
        target=run_retraining,
        args=(pipeline_main.anomaly_scorer,),
        daemon=True,
    )
    thread.start()
    # non-blocking, pipeline continues during retrain
    return {
        "status": "retraining started",
        "message": "models will be updated in background",
    }


def _ml_models_loaded() -> list[str]:
    """States with models loaded in memory, or on disk if pipeline module unavailable."""
    try:
        import main as pipeline_main

        return sorted(pipeline_main.anomaly_scorer.models.keys())
    except (ImportError, AttributeError):
        pass
    # check file existence via registry paths — no hardcoded state list in routes
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


def _scheduler_status() -> str:
    for thread in threading.enumerate():
        if thread.name == "ml-retrain-scheduler" and thread.is_alive():
            return "running"
    return "stopped"


# full pipeline health — API, Layer 1/2, ML models, and retrain scheduler
@app.get("/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow(),
        "pipeline_version": "2.0",
        "ml_models_loaded": _ml_models_loaded(),
        "layer1_status": "active",
        "layer2_status": "active",
        "scheduler_status": _scheduler_status(),
    }
