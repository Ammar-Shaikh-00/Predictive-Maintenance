"""Deprecated entry point — use live_monitor/run_retrain.py instead."""

from __future__ import annotations

import sys
from pathlib import Path

_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))


def main() -> int:
    print("NOTE: Use  python run_retrain.py  (this script only redirects there).")
    from run_retrain import main as run_retrain_main

    # Default to interactive confirm path (no --yes)
    return run_retrain_main([])


if __name__ == "__main__":
    raise SystemExit(main())
