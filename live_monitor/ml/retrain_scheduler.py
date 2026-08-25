"""PC retrain library + thin CLI.

Preferred entry point for operators:

  python run_retrain.py

This module is NOT started by live_monitor/main.py (Docker = inference only).
"""

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
from storage.backend_history import count_raw_sensor_rows  # noqa: E402

RETRAIN_STATE_FILE = os.path.join(config.ML_OUTPUT_DIR, "retrain_state.json")


def _backend_raw_row_count() -> int:
    """Count training history rows in Postgres (not SQLite)."""
    return count_raw_sensor_rows()


def _load_retrain_state() -> dict[str, Any]:
    if not os.path.isfile(RETRAIN_STATE_FILE):
        return {"backend_raw_row_count": 0, "live_api_row_count": 0, "retrained_at": None}
    with open(RETRAIN_STATE_FILE, encoding="utf-8") as f:
        return json.load(f)


def check_new_data() -> bool:
    """Return True when Postgres raw rows since last retrain meet the configured minimum."""
    current = _backend_raw_row_count()
    last_state = _load_retrain_state()
    last_count = int(
        last_state.get("backend_raw_row_count")
        or last_state.get("live_api_row_count")
        or 0
    )
    new_rows = max(0, current - last_count)
    if new_rows >= config.RETRAIN_MIN_NEW_ROWS:
        logging.info(
            "Retrain allowed: %s new Postgres rows (min=%s, total=%s)",
            new_rows,
            config.RETRAIN_MIN_NEW_ROWS,
            current,
        )
        return True
    logging.info(
        "Retrain skipped: only %s new Postgres rows (min=%s, total=%s)",
        new_rows,
        config.RETRAIN_MIN_NEW_ROWS,
        current,
    )
    return False


def save_retrain_state(row_count: int) -> None:
    """Persist Postgres raw row count and timestamp after a successful retrain."""
    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    payload = {
        "backend_raw_row_count": row_count,
        "live_api_row_count": row_count,
        "retrained_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(RETRAIN_STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def run_retraining(
    anomaly_scorer_instance: Any | None = None,
    state_detector_instance: Any | None = None,
) -> None:
    """Run the 5-minute live-scale ML pipeline and optionally hot-reload in-memory models."""
    # Lazy imports: training stack needs matplotlib/sklearn extras; keep live startup light.
    from ml.cluster_live_states import main as cluster_live_states_main
    from ml.map_live_cluster_states import main as map_live_cluster_states_main
    from ml.train_anomaly_cooling import main as train_anomaly_cooling_main
    from ml.train_anomaly_heating import main as train_anomaly_heating_main
    from ml.train_anomaly_low_production import main as train_anomaly_low_production_main
    from ml.train_anomaly_off import main as train_anomaly_off_main
    from ml.train_anomaly_production import main as train_anomaly_production_main
    from ml.train_anomaly_ready import main as train_anomaly_ready_main
    from ml.train_state_classifier import main as train_state_classifier_main
    from storage.build_live_windows import main as build_live_windows_main

    logging.info("Starting ML retraining pipeline (Postgres history, 5-min windows)...")

    # step 1: rebuild 5-min windows from Postgres raw history
    build_live_windows_main()

    # step 2: re-cluster states on live-scale windows
    cluster_live_states_main()

    # step 3: remap cluster labels to machine states → LIVE_LABELED_CSV
    map_live_cluster_states_main()

    # step 3b: remove false LOW_PRODUCTION / false COOLING labels from live evidence
    from ml.correct_false_state_labels import correct_labeled_csv

    fix_stats = correct_labeled_csv()
    logging.info("False state label correction: %s", fix_stats)

    # step 4: retrain state classifier from labeled windows
    train_state_classifier_main()

    # step 5: retrain per-state Isolation Forest anomaly models
    for trainer in (
        train_anomaly_production_main,
        train_anomaly_off_main,
        train_anomaly_heating_main,
        train_anomaly_low_production_main,
        train_anomaly_cooling_main,
        train_anomaly_ready_main,
    ):
        try:
            trainer()
        except Exception:
            logging.exception(
                "Anomaly trainer failed: %s",
                getattr(trainer, "__name__", trainer),
            )

    # step 6: optional in-process hot-reload (only if callers pass live instances)
    if anomaly_scorer_instance is not None:
        anomaly_scorer_instance._load_all_models()
    if state_detector_instance is not None and hasattr(
        state_detector_instance, "reload_models"
    ):
        state_detector_instance.reload_models()

    current_row_count = _backend_raw_row_count()
    save_retrain_state(current_row_count)
    logging.info(
        "ML retraining complete — .pkl saved under %s. "
        "Copy to server ml_data/ then POST /ml/reload-models (or restart live-monitor).",
        config.ML_OUTPUT_DIR,
    )


def start_scheduler(
    anomaly_scorer_instance: Any | None = None,
    state_detector_instance: Any | None = None,
) -> threading.Thread:
    """PC-only daemon: periodically retrain when enough new data exists.

    Do not call from live_monitor/main.py (Docker must stay inference-only).
    """

    def _scheduler_loop() -> None:
        while True:
            time.sleep(config.RETRAIN_INTERVAL_HOURS * 3600)
            if check_new_data():
                try:
                    run_retraining(anomaly_scorer_instance, state_detector_instance)
                    logging.info("PC retrain finished; deploy .pkl to server if needed")
                except Exception:
                    logging.exception("ML retraining failed")
            else:
                logging.info("Retraining skipped - insufficient new data")

    thread = threading.Thread(target=_scheduler_loop, name="ml-retrain-scheduler", daemon=True)
    thread.start()
    logging.info(
        "PC ML retrain scheduler started (interval=%sh, min_new_rows=%s, source=postgres)",
        config.RETRAIN_INTERVAL_HOURS,
        config.RETRAIN_MIN_NEW_ROWS,
    )
    return thread


def main(argv: list[str] | None = None) -> int:
    """Thin wrapper — prefer `python run_retrain.py`."""
    from run_retrain import main as run_retrain_main

    # Map old flags: --force => --yes (train now)
    mapped: list[str] = []
    for arg in list(argv if argv is not None else sys.argv[1:]):
        if arg == "--force":
            mapped.append("--yes")
        else:
            mapped.append(arg)
    if not mapped:
        mapped = ["--yes"]
    return run_retrain_main(mapped)


if __name__ == "__main__":
    raise SystemExit(main())
