"""Track which machine states we are collecting live data for (PC-side, data-driven).

No process hardcoding — records counts from Postgres live windows so you know
when new examples of states (e.g. COOLING, LOW_PRODUCTION) exist to retrain.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import config
from storage.backend_client import BackendClient

COLLECTION_STATE_FILE = os.path.join(config.ML_OUTPUT_DIR, "state_collection.json")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_collection_state() -> dict[str, Any]:
    if not os.path.isfile(COLLECTION_STATE_FILE):
        return {}
    try:
        with open(COLLECTION_STATE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_collection_state(payload: dict[str, Any]) -> None:
    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    with open(COLLECTION_STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def count_windows_by_state(
    client: BackendClient | None = None,
    *,
    pages: int = 20,
    page_size: int = 100,
) -> dict[str, int]:
    """Count confirmed_state on recent live_process_windows (newest first)."""
    client = client or BackendClient()
    counts: dict[str, int] = {}
    for page in range(pages):
        rows = client.list_live_process_windows(limit=page_size, offset=page * page_size)
        if not rows:
            break
        for row in rows:
            state = str(row.get("confirmed_state") or "UNKNOWN").upper()
            counts[state] = counts.get(state, 0) + 1
        if len(rows) < page_size:
            break
    return counts


def start_focus(state: str, *, note: str | None = None) -> dict[str, Any]:
    """Remember we are collecting this state; keep prior completed focuses in history."""
    state = str(state).strip().upper()
    counts = count_windows_by_state()
    prev = load_collection_state()
    history = list(prev.get("completed_focuses") or [])
    # If previous focus still open, auto-complete it into history
    if prev.get("focus_state") and not prev.get("completed_at"):
        old = str(prev["focus_state"]).upper()
        start_n = int(prev.get("focus_count_at_start") or 0)
        now_n = int(counts.get(old, 0))
        history.append(
            {
                "focus_state": old,
                "started_at": prev.get("started_at"),
                "completed_at": _utc_now(),
                "focus_count_at_start": start_n,
                "focus_count_at_complete": now_n,
                "new_focus_windows": max(0, now_n - start_n),
                "note": prev.get("note"),
            }
        )

    payload = {
        "focus_state": state,
        "focus_states": sorted(
            {
                *(prev.get("focus_states") or []),
                *[h.get("focus_state") for h in history if h.get("focus_state")],
                state,
            }
        ),
        "started_at": _utc_now(),
        "note": note
        or (
            f"Collect live {state} behaviour from pipeline → Postgres. "
            "Retrain learns COOLING + LOW_PRODUCTION (and all states) from history."
        ),
        "window_counts_at_start": counts,
        "focus_count_at_start": int(counts.get(state, 0)),
        "completed_at": None,
        "window_counts_at_complete": None,
        "focus_count_at_complete": None,
        "new_focus_windows": None,
        "completed_focuses": history,
        "retrain_targets": sorted(
            {
                *(prev.get("retrain_targets") or []),
                *[h.get("focus_state") for h in history if h.get("focus_state")],
                state,
            }
        ),
    }
    save_collection_state(payload)
    return payload


def complete_focus() -> dict[str, Any]:
    """Mark current focus complete and keep it in retrain_targets history."""
    prev = load_collection_state()
    if not prev.get("focus_state"):
        raise RuntimeError(
            "No active focus — run: python run_retrain.py --focus LOW_PRODUCTION"
        )

    state = str(prev["focus_state"]).upper()
    counts = count_windows_by_state()
    start_n = int(prev.get("focus_count_at_start") or 0)
    now_n = int(counts.get(state, 0))
    history = list(prev.get("completed_focuses") or [])
    entry = {
        "focus_state": state,
        "started_at": prev.get("started_at"),
        "completed_at": _utc_now(),
        "focus_count_at_start": start_n,
        "focus_count_at_complete": now_n,
        "new_focus_windows": max(0, now_n - start_n),
        "note": prev.get("note"),
    }
    history.append(entry)
    targets = sorted(
        {
            *(prev.get("retrain_targets") or []),
            *[h.get("focus_state") for h in history if h.get("focus_state")],
        }
    )
    payload = {
        **prev,
        "completed_at": entry["completed_at"],
        "window_counts_at_complete": counts,
        "focus_count_at_complete": now_n,
        "new_focus_windows": entry["new_focus_windows"],
        "completed_focuses": history,
        "retrain_targets": targets,
        "retrain_hint": "python run_retrain.py --yes",
    }
    save_collection_state(payload)
    return payload


def wait_for_state(
    target_state: str,
    *,
    poll_seconds: float = 15.0,
    stable_hits: int = 3,
) -> dict[str, Any]:
    """Poll live run evaluations until target confirmed state appears stably."""
    import time

    target = str(target_state).strip().upper()
    client = BackendClient()
    hits = 0
    last = None
    print(f"Waiting until live state is {target} (need {stable_hits} consecutive polls)...", flush=True)
    print("LOW_PRODUCTION (and other) data keeps saving to Postgres meanwhile.", flush=True)
    while True:
        try:
            rows = client.list_live_run_evaluations(limit=1, offset=0)
            current = None
            created = None
            if rows:
                current = str(rows[0].get("detected_state") or "").upper() or None
                created = rows[0].get("created_at")
            if current != last:
                print(f"  live state={current or 'UNKNOWN'} at {created}", flush=True)
                last = current
            if current == target:
                hits += 1
                print(f"  {target} hit {hits}/{stable_hits}", flush=True)
                if hits >= stable_hits:
                    return {"reached_state": target, "at": created, "polls": hits}
            else:
                hits = 0
        except Exception as exc:
            print(f"  poll warning: {exc}", flush=True)
            hits = 0
        time.sleep(poll_seconds)


def print_collection_report() -> None:
    prev = load_collection_state()
    counts = count_windows_by_state()
    print("=== Live window counts (recent sample from Postgres) ===")
    for state, n in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {state}: {n}")

    labeled = os.path.join(config.ML_OUTPUT_DIR, "ml_live_labeled.csv")
    if os.path.isfile(labeled):
        try:
            import pandas as pd

            df = pd.read_csv(labeled)
            col = "predicted_state" if "predicted_state" in df.columns else None
            if col:
                print("=== Labeled training windows (last build) ===")
                print(df[col].value_counts().to_string())
        except Exception as exc:
            print(f"labeled csv: {exc}")

    targets = prev.get("retrain_targets") or []
    if targets:
        print(f"=== Retrain targets (collected phases): {', '.join(targets)} ===")

    history = prev.get("completed_focuses") or []
    for h in history[-5:]:
        print(
            f"  done {h.get('focus_state')}: "
            f"+{h.get('new_focus_windows')} windows "
            f"(completed {h.get('completed_at')})"
        )

    if not prev.get("focus_state"):
        print("No active state focus. Example: python run_retrain.py --focus LOW_PRODUCTION")
        return

    focus = str(prev["focus_state"]).upper()
    start_n = int(prev.get("focus_count_at_start") or 0)
    now_n = int(counts.get(focus, 0))
    print(f"=== Active focus: {focus} ===")
    print(f"  started_at:     {prev.get('started_at')}")
    print(f"  note:           {prev.get('note')}")
    print(f"  count at start: {start_n}")
    print(f"  count now:      {now_n}")
    print(f"  delta (sample): {now_n - start_n}")
    if prev.get("completed_at"):
        print(f"  completed_at:   {prev.get('completed_at')}")
        print(f"  next: {prev.get('retrain_hint')}")
    else:
        print("  When this phase finishes:")
        print("    python run_retrain.py --complete-focus")
        print("    python run_retrain.py --yes")
