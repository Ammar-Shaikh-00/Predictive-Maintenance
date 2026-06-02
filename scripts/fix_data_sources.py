"""Fix incorrectly tagged live_api rows that contain historical/simulation data."""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import text

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_LIVE_MONITOR_ROOT = _PROJECT_ROOT / "live_monitor"
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

from storage.db_writer import engine  # noqa: E402

CUTOFF = "2026-04-28 00:00:00"

_COUNT_QUERY = text(
    """
    SELECT source, COUNT(*),
           MIN(trend_date), MAX(trend_date)
    FROM machine_sensor_raw
    GROUP BY source
    """
)


def _print_counts(title: str) -> dict[str, int]:
    """Query machine_sensor_raw GROUP BY source; print count and date range."""
    print(f"\n=== {title} ===")
    counts: dict[str, int] = {}
    with engine.connect() as conn:
        for source, count, min_date, max_date in conn.execute(_COUNT_QUERY):
            counts[str(source)] = int(count)
            print(f"  {source}: count={count}, min={min_date}, max={max_date}")
    return counts


def main() -> None:
    # step 1: show current counts before fix
    before = _print_counts("Before fix")
    live_before = before.get("live_api", 0)

    # step 2: re-tag contaminated rows
    # pipeline started Apr 28
    # anything before that tagged as live_api is simulation data
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                UPDATE machine_sensor_raw
                SET source = 'simulation'
                WHERE source = 'live_api'
                AND trend_date < :cutoff
                """
            ),
            {"cutoff": CUTOFF},
        )
        rows_retagged = int(result.rowcount)

    # step 3: show counts after fix
    after = _print_counts("After fix")
    live_after = after.get("live_api", 0)

    # step 4: summary
    print("\n=== Summary ===")
    print(f"  rows retagged: {rows_retagged}")
    print(f"  real live rows remaining (live_api): {live_after}")
    print(f"  live_api before: {live_before} -> after: {live_after}")


if __name__ == "__main__":
    main()
