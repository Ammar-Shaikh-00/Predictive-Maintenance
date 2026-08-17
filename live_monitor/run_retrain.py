"""PC-only retrain service (separate from live-monitor Docker).

  python run_retrain.py --status
  python run_retrain.py --focus LOW_PRODUCTION
  python run_retrain.py --wait-until PRODUCTION --then-retrain
  python run_retrain.py --yes
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from ml.retrain_scheduler import (  # noqa: E402
    RETRAIN_STATE_FILE,
    check_new_data,
    run_retraining,
    start_scheduler,
    _backend_raw_row_count,
    _load_retrain_state,
)
from storage.backend_history import (  # noqa: E402
    history_time_range,
    resolve_history_context,
)
from storage.state_collection import (  # noqa: E402
    complete_focus,
    print_collection_report,
    start_focus,
    wait_for_state,
)


def _print_status() -> None:
    print("=== Retrain service status (PC) ===")
    print(f"backend:     {config.BACKEND_BASE_URL}")
    print(f"ml_data:     {config.ML_OUTPUT_DIR}")
    print(f"min new rows:{config.RETRAIN_MIN_NEW_ROWS}")
    print(f"loop hours:  {config.RETRAIN_INTERVAL_HOURS}")
    try:
        machine_id, line_id = resolve_history_context()
        date_from, date_to = history_time_range()
        total = _backend_raw_row_count()
        print(f"machine_id:  {machine_id}")
        print(f"line_id:     {line_id}")
        print(f"history:     {date_from.isoformat()} -> {date_to.isoformat()}")
        print(f"raw rows:    {total}")
    except Exception as exc:
        print(f"history:     ERROR — {exc}")

    state = _load_retrain_state()
    last = int(state.get("backend_raw_row_count") or state.get("live_api_row_count") or 0)
    print(f"last retrain rows baseline: {last}")
    print(f"last retrained_at:          {state.get('retrained_at')}")
    print(f"state file:                 {RETRAIN_STATE_FILE}")
    if os.path.isdir(config.ML_OUTPUT_DIR):
        pkls = sorted(p.name for p in Path(config.ML_OUTPUT_DIR).glob("*.pkl"))
        print(f"pkl files ({len(pkls)}):")
        for name in pkls[:20]:
            print(f"  - {name}")
        if len(pkls) > 20:
            print(f"  ... +{len(pkls) - 20} more")
    print()
    print_collection_report()


def _confirm() -> bool:
    answer = input("Proceed with full retrain now? (yes/no): ").strip().lower()
    return answer in ("yes", "y")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Manual PC retrain service — not part of live-monitor Docker."
    )
    parser.add_argument("--yes", "-y", action="store_true")
    parser.add_argument("--if-new", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--focus", metavar="STATE")
    parser.add_argument("--complete-focus", action="store_true")
    parser.add_argument(
        "--wait-until",
        metavar="STATE",
        help="Wait until live detected_state reaches this (e.g. PRODUCTION)",
    )
    parser.add_argument(
        "--then-retrain",
        action="store_true",
        help="With --wait-until: complete focus and retrain after target state",
    )
    parser.add_argument("--loop", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s - %(message)s",
    )

    if args.status:
        _print_status()
        return 0

    if args.focus:
        payload = start_focus(args.focus)
        print(f"Focus started: {payload['focus_state']}")
        print(f"  started_at: {payload['started_at']}")
        print(
            f"  {payload['focus_state']} windows in recent sample at start: "
            f"{payload['focus_count_at_start']}"
        )
        print("Keep live-monitor running — it saves real behaviour to Postgres.")
        print("When back to PRODUCTION:")
        print("  python run_retrain.py --wait-until PRODUCTION --then-retrain")
        return 0

    if args.wait_until:
        reached = wait_for_state(args.wait_until)
        print(f"Reached {reached['reached_state']} at {reached.get('at')}")
        if args.then_retrain:
            try:
                done = complete_focus()
                print(
                    f"Focus completed: {done.get('focus_state')} "
                    f"(+{done.get('new_focus_windows')} sample delta)"
                )
            except RuntimeError as exc:
                print(f"Note: {exc}")
            print("\nStarting full retrain (Backend history → train → save .pkl)...")
            run_retraining()
            print("\n=== Done ===")
            print(f"Models saved under: {config.ML_OUTPUT_DIR}")
            print("Next: POST /ml/reload-models (or restart live-monitor)")
        else:
            print("Next: python run_retrain.py --complete-focus")
            print("Then:  python run_retrain.py --yes")
        return 0

    if args.complete_focus:
        try:
            payload = complete_focus()
        except RuntimeError as exc:
            print(str(exc))
            return 1
        print(f"Focus completed: {payload['focus_state']}")
        print(f"  new windows (sample delta): {payload.get('new_focus_windows')}")
        print("Next: python run_retrain.py --yes")
        return 0

    if args.loop:
        print("PC retrain loop starting (Ctrl+C to stop).")
        start_scheduler()
        try:
            import time

            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            print("PC retrain loop stopped.")
        return 0

    _print_status()
    print()

    if args.if_new and not check_new_data():
        print("Not enough new rows — skipped. Use without --if-new to force update.")
        return 0

    if not args.yes and not _confirm():
        print("Aborted — no retraining performed.")
        return 0

    print("\nStarting full retrain (Backend history → train → save .pkl)...")
    run_retraining()
    print("\n=== Done ===")
    print(f"Models saved under: {config.ML_OUTPUT_DIR}")
    print("Next:")
    print("  1) Copy new .pkl files to server live-monitor ml_data/")
    print("  2) POST /ml/reload-models (or restart the container)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
