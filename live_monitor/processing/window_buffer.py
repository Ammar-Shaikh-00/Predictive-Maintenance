"""Rolling window buffer module for recent live machine data."""

from __future__ import annotations

from collections import deque
from datetime import datetime, timedelta, timezone

import pandas as pd

from live_monitor import config

# full sensor data needed for accurate feature calculation
TEMP_ZONE_KEYS = [
    "temp_zone_7",
    "temp_zone_8",
    "temp_zone_9",
    "temp_zone_10",
    "temp_zone_11",
    "temp_zone_27",
    "temp_zone_28",
    "temp_zone_29",
    "temp_zone_30",
    "temp_zone_31",
    "temp_zone_32",
]


class WindowBuffer:
    """Maintain a time-based rolling buffer of incoming machine readings."""

    def __init__(self) -> None:
        """Initialize an empty buffer and load window duration configuration."""
        self.buffer: deque[dict] = deque(maxlen=config.BUFFER_MAX_POINTS)
        self.window_duration_seconds = config.WINDOW_DURATION_SECONDS
        self.min_points = config.BUFFER_MIN_POINTS

    def add(self, data_point: dict) -> None:
        """Add a new data point to the buffer and trim old entries."""
        # called every time a new API reading arrives
        # store full data_point dict (timestamp, screw_speed, pressure, load, temperature, all zones)
        point = dict(data_point)
        for key in TEMP_ZONE_KEYS:
            point.setdefault(key, None)
        self.buffer.append(point)

    def _trim(self) -> None:
        """Remove readings that are older than the configured rolling window."""
        # keeps buffer clean, only data within WINDOW_DURATION_SECONDS stays
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=self.window_duration_seconds)
        trimmed_buffer: list[dict] = []

        for point in self.buffer:
            # Use local ingest timestamp for rolling window behavior.
            # Fall back to API timestamp for backward compatibility.
            timestamp_raw = point.get("buffer_timestamp", point.get("timestamp"))
            if timestamp_raw is None:
                continue
            timestamp = pd.to_datetime(timestamp_raw, utc=True, errors="coerce")
            if pd.isna(timestamp):
                continue
            if timestamp.to_pydatetime() >= cutoff:
                trimmed_buffer.append(point)

        self.buffer = trimmed_buffer

    def get_window(self) -> pd.DataFrame | None:
        """Return the current buffer as a DataFrame, or None if empty."""
        # used by feature engine to calculate features on current window
        # feature engine needs individual zone columns
        # to calculate front/rear temp_spread correctly
        if not self.buffer:
            return None
        return pd.DataFrame(list(self.buffer))

    def is_ready(self) -> bool:
        """Check whether the buffer has enough points for feature calculation."""
        return len(self.buffer) >= self.min_points
