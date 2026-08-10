"""Live API client for fetching and normalizing extruder sensor values."""

from __future__ import annotations

from datetime import datetime, timezone
import logging

import requests

import config


class APIClient:
    """API client that polls live endpoint and returns normalized sensor data."""

    def __init__(self) -> None:
        """Initialize endpoint settings from config."""
        self.api_url = config.API_URL
        self.api_timeout_seconds = config.API_TIMEOUT_SECONDS

    def fetch_latest(self) -> dict[str, object] | None:
        """Fetch latest live sensor values and normalize for pipeline usage."""
        # returns None if call fails; pipeline skips that cycle
        try:
            response = requests.get(
                config.API_URL,
                timeout=config.API_TIMEOUT_SECONDS,
            )

            if response.status_code != 200:
                logging.warning("API call failed: %s", response.status_code)
                return None

            raw = response.json()
            data = raw.get("rows", None)
            if data is None:
                logging.warning("API response missing 'rows' key")
                return None

            screw_speed = data.get(config.FIELD_SCREW_SPEED, None)
            pressure = data.get(config.FIELD_PRESSURE, None)
            load = data.get(config.FIELD_LOAD, None)

            temp_values = [
                data[z] for z in config.FIELD_TEMPERATURE_ZONES if z in data and data[z] is not None
            ]
            temperature = sum(temp_values) / len(temp_values) if temp_values else None

            # Keep the raw machine timestamp for traceability, but use
            # local ingest time for rolling-window buffering stability.
            source_timestamp = self._parse_timestamp(data.get(config.FIELD_TIMESTAMP))
            buffer_timestamp = datetime.utcnow()

            return {
                "timestamp": source_timestamp,
                "buffer_timestamp": buffer_timestamp,
                "source": "live_api",
                "screw_speed": screw_speed,
                "pressure": pressure,
                "load": load,
                "temperature": temperature,
                "temp_zone_7": data.get("Val_7"),
                "temp_zone_8": data.get("Val_8"),
                "temp_zone_9": data.get("Val_9"),
                "temp_zone_10": data.get("Val_10"),
                "temp_zone_11": data.get("Val_11"),
                "temp_zone_27": data.get("Val_27"),
                "temp_zone_28": data.get("Val_28"),
                "temp_zone_29": data.get("Val_29"),
                "temp_zone_30": data.get("Val_30"),
                "temp_zone_31": data.get("Val_31"),
                "temp_zone_32": data.get("Val_32"),
                "Val_2": data.get("Val_2"),
                "Val_3": data.get("Val_3"),
                "Val_4": data.get("Val_4"),
                "Val_19": data.get("Val_19"),
                "Val_20": data.get("Val_20"),
                "Val_33": data.get("Val_33"),
            }
        except Exception as exc:  # pragma: no cover - runtime API safety
            logging.warning("API fetch failed: %s", exc)
            return None

    def _parse_timestamp(self, value) -> datetime:
        """Parse API TrendDate value into datetime with safe fallback."""
        if value is None:
            logging.warning("Missing TrendDate in API payload; using current UTC time.")
            return datetime.utcnow()

        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        except Exception:
            logging.warning("Failed to parse TrendDate, using UTC now")
            return datetime.utcnow()
