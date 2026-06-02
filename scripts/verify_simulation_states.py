"""Verify state detection and anomaly scoring at replay segments for HEATING/COOLING/PRODUCTION."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT))
sys.path.insert(0, str(_ROOT / "live_monitor"))

import config  # noqa: E402
from ingestion.api_client import APIClient  # noqa: E402
from ml.anomaly_scorer import AnomalyScorer  # noqa: E402
from processing.feature_engine import FeatureEngine  # noqa: E402
from processing.window_buffer import WindowBuffer  # noqa: E402
from state.state_detector import StateDetector  # noqa: E402

LABELED_PATH = os.path.join(os.path.dirname(config.LIVE_WINDOWS_CSV), "ml_live_labeled.csv")
CYCLES_PER_SEGMENT = 15
TEMP_COLS = [
    "Val_7", "Val_8", "Val_9", "Val_10", "Val_11",
    "Val_27", "Val_28", "Val_29", "Val_30", "Val_31", "Val_32",
]


def _temperature_direction_10_rows(temp_series: pd.Series) -> float:
    values = pd.to_numeric(temp_series, errors="coerce").dropna().to_numpy()
    if len(values) < 2:
        return 0.0
    mid = len(values) // 2
    return float(values[mid:].mean() - values[:mid].mean())


def _find_segment_starts(replay_df: pd.DataFrame) -> dict[str, int]:
    """Pick CSV indices where 10-row live-style features match each state."""
    temp = replay_df[TEMP_COLS].mean(axis=1)
    speed = pd.to_numeric(replay_df["Val_1"], errors="coerce")
    pressure = pd.to_numeric(replay_df["Val_6"], errors="coerce")

    directions: list[float] = []
    row_indices: list[int] = []
    for i in range(10, len(replay_df)):
        directions.append(_temperature_direction_10_rows(temp.iloc[i - 10 : i]))
        row_indices.append(i)

    scan = pd.DataFrame(
        {
            "row_idx": row_indices,
            "temp_direction": directions,
            "speed": speed.iloc[10:].to_numpy(),
            "pressure": pressure.iloc[10:].to_numpy(),
        }
    )

    early = scan[scan["row_idx"] < 8000]
    heating = early[(early["temp_direction"] > 0.5) & (early["speed"] < 5)]
    if heating.empty:
        heating = scan[(scan["temp_direction"] > 0.5) & (scan["speed"] < 5)]
    cooling = early[(early["temp_direction"] < -0.15) & (early["speed"] < 10)]
    if cooling.empty:
        cooling = scan[(scan["temp_direction"] < -0.15) & (scan["speed"] < 10)]
    production = scan[(scan["speed"] > 80) & (scan["pressure"] > 300)]

    if heating.empty or cooling.empty or production.empty:
        raise RuntimeError("Could not locate HEATING/COOLING/PRODUCTION segments in CSV")

    return {
        "HEATING": max(int(heating.iloc[0]["row_idx"]) - 5, 0),
        "COOLING": max(int(cooling.iloc[len(cooling) // 2]["row_idx"]) - 5, 0),
        "PRODUCTION": max(int(production.iloc[len(production) // 2]["row_idx"]) - 5, 0),
    }


def _run_segment(
    state_name: str,
    start_idx: int,
    client: APIClient,
    engine: FeatureEngine,
    detector: StateDetector,
    scorer: AnomalyScorer,
) -> dict:
    replay = client.replay
    buffer = WindowBuffer()
    detector.candidate_history.clear()
    detector.current_confirmed_state = None
    detector.state_window_count = 0

    replay.current_index = start_idx
    for _ in range(10):
        point = replay.get_next()
        if point:
            buffer.add(point)

    last: dict = {}
    for _ in range(CYCLES_PER_SEGMENT):
        point = replay.get_next()
        if not point:
            break
        buffer.add(point)
        if not buffer.is_ready():
            continue
        features = engine.calculate(buffer.get_window())
        if not features:
            continue
        candidate = detector.detect_candidate(features)
        confirmed = detector.confirm_state(candidate)
        ml = scorer.score(features, confirmed)
        last = {
            "candidate": candidate,
            "confirmed": confirmed,
            "temp_direction": round(float(features.get("temperature_direction", 0)), 4),
            "ml_is_anomaly": ml.get("ml_is_anomaly"),
            "ml_score": ml.get("ml_anomaly_score"),
            "ml_status": ml.get("ml_model_status"),
        }

    last["expected"] = state_name
    last["start_idx"] = start_idx
    return last


def main() -> None:
    client = APIClient()
    engine = FeatureEngine()
    scorer = AnomalyScorer()
    starts = _find_segment_starts(client.replay.df)
    print("Replay segment indices:", starts)
    results = []
    for state, idx in starts.items():
        detector = StateDetector()
        results.append(_run_segment(state, idx, client, engine, detector, scorer))

    print("\n=== Simulation verification ===")
    all_ok = True
    for r in results:
        state_ok = r.get("confirmed") == r["expected"] or r.get("candidate") == r["expected"]
        anomaly_ok = r.get("ml_is_anomaly") is False
        ok = state_ok and anomaly_ok
        all_ok = all_ok and ok
        mark = "PASS" if ok else "FAIL"
        print(
            f"[{mark}] {r['expected']:12} | candidate={r.get('candidate')} "
            f"confirmed={r.get('confirmed')} | temp_dir={r.get('temp_direction')} "
            f"| anomaly={r.get('ml_is_anomaly')} score={r.get('ml_score')}"
        )

    if not all_ok:
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
