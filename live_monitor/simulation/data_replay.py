"""Replay historical extruder CSV/XLSX rows through the pipeline like live API polls."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402

_TEMP_COLS = [
    "Val_7",
    "Val_8",
    "Val_9",
    "Val_10",
    "Val_11",
    "Val_27",
    "Val_28",
    "Val_29",
    "Val_30",
    "Val_31",
    "Val_32",
]


def _read_simulation_file(path: str) -> pd.DataFrame:
    """Load CSV or Excel based on file extension."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(path, low_memory=False)
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(path)
    raise ValueError(f"Unsupported file extension: {ext}")


def _parse_trend_date(value: Any) -> datetime | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    parsed = pd.to_datetime(value, utc=True, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.to_pydatetime().replace(tzinfo=None)


class DataReplayService:
    """Serve historical rows one at a time in api_client.fetch_latest() format."""

    def __init__(self) -> None:
        # tracks current position in replay data
        self.df: pd.DataFrame | None = None
        self.current_index = 0
        self.is_running = False

    def load(self) -> None:
        """Load full historical dataset on startup."""
        path = config.SIMULATION_CSV
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Simulation file not found: {path}")

        df = _read_simulation_file(path)
        if config.FIELD_TIMESTAMP not in df.columns:
            raise ValueError(f"Missing required column: {config.FIELD_TIMESTAMP}")

        df = df.copy()
        df[config.FIELD_TIMESTAMP] = df[config.FIELD_TIMESTAMP].apply(_parse_trend_date)
        df = df.dropna(subset=[config.FIELD_TIMESTAMP]).sort_values(
            config.FIELD_TIMESTAMP, ascending=True
        )
        self.df = df.reset_index(drop=True)
        self.current_index = 0
        self.is_running = True

        date_min = self.df[config.FIELD_TIMESTAMP].min()
        date_max = self.df[config.FIELD_TIMESTAMP].max()
        print(f"Simulation loaded: {len(self.df)} rows")
        print(f"Date range: {date_min} -> {date_max}")
        print(f"Columns: {list(self.df.columns)}")

    def get_next(self) -> dict[str, Any] | None:
        """Return next row as normalized dict — same shape as api_client.fetch_latest()."""
        if self.df is None or self.current_index >= len(self.df):
            print("Simulation complete - all rows replayed")
            self.current_index = 0
            # loop back to start when finished
            return None

        row = self.df.iloc[self.current_index]
        self.current_index += 1

        # calculate temperature mean from zone columns
        temp_values = [
            row[c] for c in _TEMP_COLS if c in row.index and pd.notna(row[c])
        ]
        temperature = sum(temp_values) / len(temp_values) if temp_values else None

        source_timestamp = row.get(config.FIELD_TIMESTAMP)
        if isinstance(source_timestamp, pd.Timestamp):
            source_timestamp = source_timestamp.to_pydatetime().replace(tzinfo=None)
        # pipeline processes it identically to live data
        return {
            "timestamp": source_timestamp,
            "buffer_timestamp": datetime.now(timezone.utc).replace(tzinfo=None),
            "source": "simulation",
            # simulation data kept separate from live_api data
            # allows retraining on simulation only without mixing
            "screw_speed": row.get("Val_1"),
            "pressure": row.get("Val_6"),
            "load": row.get("Val_5"),
            "temperature": temperature,
            "temp_zone_7": row.get("Val_7"),
            "temp_zone_8": row.get("Val_8"),
            "temp_zone_9": row.get("Val_9"),
            "temp_zone_10": row.get("Val_10"),
            "temp_zone_11": row.get("Val_11"),
            "temp_zone_27": row.get("Val_27"),
            "temp_zone_28": row.get("Val_28"),
            "temp_zone_29": row.get("Val_29"),
            "temp_zone_30": row.get("Val_30"),
            "temp_zone_31": row.get("Val_31"),
            "temp_zone_32": row.get("Val_32"),
            "Val_2": row.get("Val_2"),
            "Val_3": row.get("Val_3"),
            "Val_4": row.get("Val_4"),
            "Val_19": row.get("Val_19"),
            "Val_20": row.get("Val_20"),
            "Val_33": row.get("Val_33"),
        }

    def reset(self) -> None:
        """Restart replay from beginning."""
        self.current_index = 0

    def progress(self) -> dict[str, float | int]:
        """Track replay progress."""
        total = len(self.df) if self.df is not None else 0
        percent = round(self.current_index / total * 100, 1) if total else 0.0
        return {
            "current_index": self.current_index,
            "total_rows": total,
            "percent": percent,
        }


if __name__ == "__main__":
    service = DataReplayService()
    service.load()
    print("First row:", service.get_next())
    print("Progress:", service.progress())
