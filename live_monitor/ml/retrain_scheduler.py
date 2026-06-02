"""Background scheduler to retrain ML models when enough new live data exists."""

from __future__ import annotations

import json
import logging
import os
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from ml.cluster_states import main as cluster_states_main  # noqa: E402
from ml.map_cluster_states import main as map_cluster_states_main  # noqa: E402
from ml.train_anomaly_heating import main as train_anomaly_heating_main  # noqa: E402
from ml.train_anomaly_off import main as train_anomaly_off_main  # noqa: E402
from ml.train_anomaly_production import main as train_anomaly_production_main  # noqa: E402
from ml.train_state_classifier import main as train_state_classifier_main  # noqa: E402
from storage.build_30min_windows import main as build_30min_windows_main  # noqa: E402
from storage.db_writer import MachineSensorRaw, engine  # noqa: E402

RETRAIN_STATE_FILE = os.path.join(config.ML_OUTPUT_DIR, "retrain_state.json")


def _live_api_row_count() -> int:
    with Session(engine) as session:
        return (
            session.query(MachineSensorRaw)
            .filter(MachineSensorRaw.source == "live_api")
            .count()
        )


def _load_retrain_state() -> dict[str, Any]:
    if not os.path.isfile(RETRAIN_STATE_FILE):
        return {"live_api_row_count": 0, "retrained_at": None}
    with open(RETRAIN_STATE_FILE, encoding="utf-8") as f:
        return json.load(f)


def check_new_data() -> bool:
    """Return True when live_api rows since last retrain meet the configured minimum."""
    current_count = _live_api_row_count()
    last_state = _load_retrain_state()
    last_count = int(last_state.get("live_api_row_count", 0))
    new_rows = current_count - last_count
    # only retrain when meaningful new data exists
    if new_rows >= config.RETRAIN_MIN_NEW_ROWS:
        logging.info(
            "Retrain check: %s new live_api rows (threshold=%s)",
            new_rows,
            config.RETRAIN_MIN_NEW_ROWS,
        )
        return True
    logging.info(
        "Retrain check: %s new live_api rows — below threshold %s",
        new_rows,
        config.RETRAIN_MIN_NEW_ROWS,
    )
    return False


def save_retrain_state(row_count: int) -> None:
    """Persist live_api row count and timestamp after a successful retrain."""
    # tracks when last retrain happened
    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    payload = {
        "live_api_row_count": row_count,
        "retrained_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(RETRAIN_STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def run_retraining(anomaly_scorer_instance: Any) -> None:
    """Run the full offline ML pipeline and hot-reload anomaly models."""
    # full retraining pipeline in order
    logging.info("Starting ML retraining pipeline...")

    # step 1: rebuild 30-min windows — picks up new live_api rows automatically
    build_30min_windows_main()

    # step 2: re-cluster states — finds new patterns in updated data
    cluster_states_main()

    # step 3: remap cluster labels to machine states
    map_cluster_states_main()

    # step 4: retrain state classifier from labeled windows
    train_state_classifier_main()

    # step 5: retrain per-state Isolation Forest anomaly models
    train_anomaly_production_main()
    train_anomaly_off_main()
    train_anomaly_heating_main()

    # step 6: hot-reload without stopping pipeline
    anomaly_scorer_instance._load_all_models()

    current_row_count = _live_api_row_count()
    save_retrain_state(current_row_count)
    logging.info("ML retraining complete")


def start_scheduler(anomaly_scorer_instance: Any) -> threading.Thread:
    """Start daemon thread that periodically retrains when enough new data exists."""
    # daemon thread stops when pipeline stops

    def _scheduler_loop() -> None:
        while True:
            time.sleep(config.RETRAIN_INTERVAL_HOURS * 3600)
            if check_new_data():
                try:
                    run_retraining(anomaly_scorer_instance)
                    anomaly_scorer_instance._load_all_models()
                    logging.info("Models hot-reloaded after retraining")
                except Exception:
                    logging.exception("ML retraining failed")
            else:
                logging.info("Retraining skipped - insufficient new data")

    thread = threading.Thread(target=_scheduler_loop, name="ml-retrain-scheduler", daemon=True)
    thread.start()
    logging.info(
        "ML retrain scheduler started (interval=%sh, min_new_rows=%s)",
        config.RETRAIN_INTERVAL_HOURS,
        config.RETRAIN_MIN_NEW_ROWS,
    )
    return thread


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if check_new_data():
        from ml.anomaly_scorer import AnomalyScorer

        scorer = AnomalyScorer()
        run_retraining(scorer)
    else:
        logging.info("Retraining skipped - insufficient new data")
