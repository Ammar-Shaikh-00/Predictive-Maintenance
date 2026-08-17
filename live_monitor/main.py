"""Entry point for the live monitoring polling loop."""

import logging
import threading
import time

import config
import uvicorn
from api.routes import app
from evaluation.evaluation_guard import EvaluationGuard
from evaluation.baseline_selector import BaselineSelector
from evaluation.feature_evaluator import FeatureEvaluator
from evaluation.overall_evaluator import OverallEvaluator
from ingestion.api_client import APIClient
from processing.feature_engine import FeatureEngine
from processing.window_buffer import WindowBuffer
from storage.backend_client import BackendClient
from storage.backend_writer import BackendWriter
from storage.context_resolver import ContextResolver
from ml.anomaly_scorer import AnomalyScorer
from ml.drift_detector import DriftDetector
from state.state_detector import StateDetector

# FastAPI runs in background thread
# pipeline loop continues unaffected in main thread

# logging helps us monitor pipeline without print statements
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
)

# handles API polling
client = APIClient()
# holds rolling window of data (default 5 min @ 10s polls)
buffer = WindowBuffer()
# calculates features from window
engine = FeatureEngine()
# detects and confirms machine state
detector = StateDetector()
# persist live outputs to backend Postgres via HTTP APIs (not local SQLite)
backend_client = BackendClient()
context_resolver = ContextResolver(backend_client)
writer = BackendWriter(backend_client, context_resolver)
# stateless, single instance reused every cycle
guard = EvaluationGuard()
# stateful — caches last valid baseline for fallback (reads backend)
selector = BaselineSelector(backend_client)
# evaluation writers post to backend
evaluator = FeatureEvaluator(writer)
overall_evaluator = OverallEvaluator(writer)
# loads all available state-specific anomaly models
anomaly_scorer = AnomalyScorer()
# loads baseline stats from ml_labeled_states.csv
drift_detector = DriftDetector()


def start_api():
    # starts FastAPI on port 8001
    # log_level=warning keeps API logs clean in console
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="warning")


def run_cycle() -> None:
    """Run one full polling-to-state-detection cycle."""
    # this function runs every 10-15 seconds (one full pipeline cycle)
    live_window = None
    # initialize to None so it's always defined even if save fails

    # Step 1 — Fetch latest data from live API.
    # skip this cycle if API call fails
    try:
        data_point = client.fetch_latest()
    except Exception as exc:  # pragma: no cover - safety for live runtime
        logging.warning("Failed to fetch latest data: %s", exc)
        return
    if data_point is None:
        logging.warning("No data returned from API client.")
        return

    # Step 2 — Add latest reading into the rolling buffer.
    # new data point added to rolling window
    buffer.add(data_point)
    # save raw reading to backend machine_sensor_raw
    try:
        writer.save_raw_sensor(data_point)
    except Exception as e:
        logging.warning(f"Raw sensor save error: {e}")
    # never crashes pipeline, just logs if save fails

    # Step 3 — Wait until buffer has enough data for stable calculations.
    # wait until buffer has enough points for a full window
    if not buffer.is_ready():
        logging.info("Buffer filling up, waiting for minimum data...")
        return

    # Step 4 — Compute base and derived features for current window.
    # extract all base + derived features from current window
    features = engine.calculate(buffer.get_window())
    if features is None:
        logging.warning("Feature calculation returned no data.")
        return

    # Step 5 — Determine likely current machine state from features.
    # determine what state the machine is likely in
    candidate_state = detector.detect_candidate(features)
    logging.info("Candidate state: %s", candidate_state)

    # Step 6 — Confirm state only after repeated agreement across windows.
    # only confirmed after 3 consecutive matching windows
    confirmed_state = detector.confirm_state(candidate_state)
    if confirmed_state is not None:
        logging.info("Confirmed state: %s", confirmed_state)
    else:
        logging.info("Waiting for state confirmation...")

    # ML anomaly scoring — state-specific
    ml_result = anomaly_scorer.score(
        features=features,
        confirmed_state=confirmed_state,
    )
    logging.info(
        "ML Anomaly | state=%s | score=%s | anomaly=%s | status=%s",
        confirmed_state,
        ml_result["ml_anomaly_score"],
        ml_result["ml_is_anomaly"],
        ml_result["ml_model_status"],
    )
    # logged every cycle for monitoring

    # update drift history with current window
    drift_detector.update(
        features=features,
        confirmed_state=confirmed_state,
    )

    # detect drift every cycle
    drift_result = drift_detector.detect()

    if drift_result["drift_detected"]:
        logging.warning(
            "⚠️ DRIFT DETECTED | features=%s | details=%s",
            drift_result["drifting_features"],
            drift_result["drift_details"],
        )
    else:
        logging.info("Drift check | status=%s", drift_result["drift_status"])

    # build state_info dict for window storage
    state_info = {
        "candidate_state": candidate_state,
        "confirmed_state": confirmed_state,
        "confirmation_count": len(detector.candidate_history),
    }

    # save window to backend live_process_window
    live_window = writer.save_live_process_window(features, state_info)

    # Step 6b — run evaluation guard (data-quality / confirmation)
    guard_result = guard.check(confirmed_state, features)

    if guard_result["should_evaluate"]:
        logging.info("Guard passed - proceeding to evaluation")

        # Step 7 — select regime + baseline (from backend baseline_registry)
        ctx = context_resolver.refresh_if_needed()
        baseline_result = selector.select(
            features,
            profile_id=ctx.get("profile_id"),
        )

        logging.info(
            "Regime=%s | Method=%s | Confidence=%s",
            baseline_result["active_regime"],
            baseline_result["baseline_selection_method"],
            baseline_result["baseline_confidence"],
        )

        feature_results = []
        if baseline_result["baseline_selection_method"] != "NONE":
            # Step 8 — evaluate features against selected baseline
            feature_results = evaluator.evaluate(
                features=features,
                baseline_records=baseline_result["baseline_records"],
                live_window_id=live_window.id if live_window else None,
            )
        else:
            logging.warning(
                "No baseline available — still saving run evaluation with ML fields"
            )

        # Step 9 — overall evaluation always persisted (includes ML anomaly fields)
        run_evaluation = overall_evaluator.evaluate(
            feature_results=feature_results,
            features=features,
            baseline_result=baseline_result,
            confirmed_state=confirmed_state,
            live_window_id=live_window.id if live_window else None,
            ml_result=ml_result,
            drift_result=drift_result,
        )

        saved_evaluation = overall_evaluator.save(run_evaluation)

        # Step 10 — save feature evaluations once, linked to run evaluation
        if saved_evaluation and feature_results:
            evaluator.save(
                feature_results,
                live_run_evaluation_id=saved_evaluation.id,
            )

        findings = getattr(run_evaluation, "findings", None) or []
        top_finding = findings[0] if findings else {}
        logging.info(
            "RunEvaluation saved | status=%s | ml_anomaly=%s | ml_score=%s | finding=%s | %s",
            getattr(run_evaluation, "overall_status", None),
            getattr(run_evaluation, "ml_is_anomaly", None),
            getattr(run_evaluation, "ml_anomaly_score", None),
            top_finding.get("text"),
            run_evaluation.explanation_text,
        )

        for r in feature_results:
            current_value = 0.0 if r.current_value is None else r.current_value
            baseline_mean = 0.0 if r.baseline_mean is None else r.baseline_mean
            z_score = 0.0 if r.z_score is None else r.z_score
            logging.info(
                "  %s: value=%.3f | baseline=%.3f | z=%.2f | status=%s",
                r.feature_name,
                current_value,
                baseline_mean,
                z_score,
                r.feature_status,
            )
    else:
        logging.info("Evaluation skipped - reason: %s", guard_result["skip_reason"])

    # Step 9 — Log features summary.
    # quick snapshot of current window values
    logging.info(
        (
            "Features | screw_speed_mean=%.2f, pressure_mean=%.2f, "
            "temperature_mean=%.2f, load_mean=%.2f"
        ),
        features.get("screw_speed_mean", 0.0),
        features.get("pressure_mean", 0.0),
        features.get("temperature_mean", 0.0),
        features.get("load_mean", 0.0),

    )


if __name__ == "__main__":
    logging.info("Live monitoring pipeline started...")
    logging.info("Backend persistence URL: %s", config.BACKEND_BASE_URL)
    ctx = context_resolver.refresh_if_needed(force=True)
    logging.info(
        "Backend context | machine_id=%s | line_id=%s | production_run_id=%s | profile_id=%s",
        ctx.get("machine_id"),
        ctx.get("line_id"),
        ctx.get("production_run_id"),
        ctx.get("profile_id"),
    )

    # Retrain/scheduler are NOT started here — inference-only for Docker/server.
    # Train on PC whenever you want:  python run_retrain.py
    logging.info(
        "Auto-retrain disabled in live-monitor (inference only). "
        "On PC: python run_retrain.py → copy .pkl to ml_data/ → POST /ml/reload-models."
    )

    # start FastAPI in background thread
    # daemon=True means API stops when pipeline stops
    api_thread = threading.Thread(target=start_api, daemon=True)
    api_thread.start()
    logging.info("API running at http://localhost:8001")
    logging.info("API docs at http://localhost:8001/docs")

    # Ctrl+C to stop the pipeline cleanly
    try:
        while True:
            run_cycle()
            time.sleep(config.POLL_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        logging.info("Live monitoring pipeline stopped by user.")
