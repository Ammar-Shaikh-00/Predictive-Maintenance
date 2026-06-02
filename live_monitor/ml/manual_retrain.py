"""Manually trigger the full ML retraining pipeline after simulation completes."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from ml.cluster_live_states import main as cluster_live_states_main  # noqa: E402
from ml.map_live_cluster_states import main as map_live_cluster_states_main  # noqa: E402
from ml.model_registry import get_model_status  # noqa: E402
from ml.train_anomaly_cooling import main as train_anomaly_cooling_main  # noqa: E402
from ml.train_anomaly_heating import main as train_anomaly_heating_main  # noqa: E402
from ml.train_anomaly_low_production import main as train_anomaly_low_production_main  # noqa: E402
from ml.train_anomaly_off import main as train_anomaly_off_main  # noqa: E402
from ml.train_anomaly_production import main as train_anomaly_production_main  # noqa: E402
from ml.train_anomaly_ready import main as train_anomaly_ready_main  # noqa: E402
from ml.train_state_classifier import main as train_state_classifier_main  # noqa: E402
from storage.build_live_windows import main as build_live_windows_main  # noqa: E402
from storage.db_writer import MachineSensorRaw, engine  # noqa: E402

ALL_STATES = ("PRODUCTION", "OFF", "HEATING", "LOW_PRODUCTION", "COOLING", "READY")
RAW_SOURCES = ("simulation", "live_api", "historical_import")
MIN_WINDOWS_WARN = 20

ANOMALY_TRAINERS = {
    "PRODUCTION": train_anomaly_production_main,
    "OFF": train_anomaly_off_main,
    "HEATING": train_anomaly_heating_main,
    "LOW_PRODUCTION": train_anomaly_low_production_main,
    "COOLING": train_anomaly_cooling_main,
    "READY": train_anomaly_ready_main,
}


def print_source_counts() -> None:
    """Step 1 — print raw row counts per ingestion source."""
    # verify simulation data collected before retraining
    print("\n=== Step 1: machine_sensor_raw counts by source ===")
    with Session(engine) as session:
        total = session.query(MachineSensorRaw).count()
        for source in RAW_SOURCES:
            count = (
                session.query(MachineSensorRaw)
                .filter(MachineSensorRaw.source == source)
                .count()
            )
            print(f"  {source}: {count}")
        print(f"  total: {total}")


def check_windows_per_state() -> None:
    """Step 2 — rebuild 5-min live windows and report labeled windows per state."""
    # show what models can be trained
    print("\n=== Step 2: 5-min live windows and per-state counts ===")
    print("Running build_live_windows...")
    out_df = build_live_windows_main()
    print(f"  total windows (live feature matrix): {len(out_df)}")

    labeled_path = os.path.join(os.path.dirname(config.LIVE_WINDOWS_CSV), "ml_live_labeled.csv")
    if os.path.isfile(labeled_path):
        labeled = pd.read_csv(labeled_path)
        if "predicted_state" in labeled.columns:
            state_counts = labeled["predicted_state"].value_counts(dropna=False)
            print("  windows per state (from existing ml_live_labeled.csv):")
            for state in ALL_STATES:
                count = int(state_counts.get(state, 0))
                print(f"    {state}: {count}")
                if count < MIN_WINDOWS_WARN:
                    print(f"   {state} has only {count} windows (< {MIN_WINDOWS_WARN})")
            return

    print("  ml_live_labeled.csv not found or missing predicted_state — state counts after remap.")
    if "regime" in out_df.columns:
        print("  regime counts (feature matrix):")
        for regime, count in out_df["regime"].value_counts(dropna=False).items():
            print(f"    {regime}: {count}")


def ask_confirmation() -> bool:
    """Step 3 — require explicit yes before retraining."""
    # manual confirmation before retraining
    print("\n=== Step 3: confirmation ===")
    answer = input("Proceed with full retrain? (yes/no): ").strip().lower()
    return answer == "yes"


def run_full_retrain() -> None:
    """Step 4 — run clustering, labeling, classifier, and anomaly trainers."""
    print("\n=== Step 4: full retraining pipeline ===")

    # Step 1 — rebuild 5-min live windows
    print("\n--- Rebuild 5-min live windows ---")
    build_live_windows_main()

    # Step 2 — recluster states
    print("\n--- Recluster live states ---")
    cluster_live_states_main()

    # Step 3 — remap labels
    print("\n--- Remap live cluster labels ---")
    map_live_cluster_states_main()

    # Step 4 — retrain state classifier
    print("\n--- Retrain state classifier ---")
    train_state_classifier_main()

    # Step 5 — retrain all anomaly models
    print("\n--- Retrain per-state anomaly models ---")
    for state, trainer in ANOMALY_TRAINERS.items():
        try:
            trainer()
            print(f" {state} anomaly model trained")
        except Exception as e:
            print(f" {state} skipped: {e}")
            # skip states with insufficient data gracefully


def print_final_registry() -> None:
    """Step 5 — print model registry readiness."""
    # shows which models are now ready
    print("\n=== Step 5: model registry status ===")
    get_model_status()


def print_summary() -> None:
    """Step 6 — remind operator to restart the live pipeline."""
    # pipeline needs restart to hot-reload new models
    print("\n=== Done ===")
    print(" Manual retrain complete")
    print("Restart pipeline to load new models")


def main() -> None:
    """Run manual retrain workflow: inspect data, confirm, retrain, summarize."""
    print_source_counts()
    check_windows_per_state()

    if not ask_confirmation():
        print("Aborted — no retraining performed.")
        return

    run_full_retrain()
    print_final_registry()
    print_summary()


if __name__ == "__main__":
    main()
