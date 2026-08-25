"""Load machine_sensor_raw history from backend Postgres (no SQLite)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd

import config
from storage.backend_client import BackendClient
from storage.context_resolver import ContextResolver

# Map backend JSON keys → live_monitor / window-builder column names
_VAL_KEYS = (
    "val_1",
    "val_2",
    "val_3",
    "val_4",
    "val_5",
    "val_6",
    "val_7",
    "val_8",
    "val_9",
    "val_10",
    "val_11",
    "val_19",
    "val_20",
    "val_27",
    "val_28",
    "val_29",
    "val_30",
    "val_31",
    "val_32",
    "val_33",
)


def history_time_range() -> tuple[datetime, datetime]:
    """Inclusive training window for GET /machine-raw-data/."""
    date_to = datetime.now(timezone.utc)
    if config.HISTORY_DATE_FROM:
        date_from = datetime.fromisoformat(
            config.HISTORY_DATE_FROM.replace("Z", "+00:00")
        )
        if date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
    else:
        date_from = date_to - timedelta(days=config.HISTORY_LOOKBACK_DAYS)
    return date_from, date_to


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_history_context(
    client: BackendClient | None = None,
) -> tuple[str, int]:
    """Return (machine_id, line_id) for history queries."""
    client = client or BackendClient()
    ctx = ContextResolver(client).refresh_if_needed(force=True)
    machine_id = ctx.get("machine_id")
    line_id = ctx.get("line_id")
    if not machine_id:
        raise RuntimeError(
            "Cannot load Postgres history: machine_id unresolved "
            "(set MACHINE_ID or ensure /machines returns Extruder)."
        )
    if line_id is None:
        raise RuntimeError(
            "Cannot load Postgres history: line_id unresolved "
            "(set LINE_ID or ensure a RUNNING production-run exists)."
        )
    return str(machine_id), int(line_id)


def _row_to_training_dict(item: dict[str, Any]) -> dict[str, Any]:
    """Normalize one backend raw row for window builders."""
    ts = item.get("timestamp") or item.get("tab_actual_timestamp")
    out: dict[str, Any] = {
        "trend_date": ts,
        # Postgres has no source column — treat exported rows as live backend data
        "source": "live_api",
    }
    for key in _VAL_KEYS:
        # Val_1 style for aggregation code
        out[f"Val_{key.split('_', 1)[1]}"] = item.get(key)
    return out


def fetch_raw_sensor_dataframe(
    client: BackendClient | None = None,
    *,
    machine_id: str | None = None,
    line_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page_size: int | None = None,
) -> pd.DataFrame:
    """
    Paginate GET /machine-raw-data/ into a DataFrame for ML window builders.

    Columns include trend_date, Val_*, source (always 'live_api' for Postgres rows).
    """
    client = client or BackendClient()
    if machine_id is None or line_id is None:
        machine_id, line_id = resolve_history_context(client)
    if date_from is None or date_to is None:
        date_from, date_to = history_time_range()

    limit = page_size or config.RAW_PAGE_SIZE
    limit = max(1, min(int(limit), 10_000))
    offset = 0
    rows: list[dict[str, Any]] = []

    logging.info(
        "Loading Postgres raw history machine_id=%s line_id=%s from=%s to=%s",
        machine_id,
        line_id,
        _iso(date_from),
        _iso(date_to),
    )

    while True:
        page = client.get_machine_raw_page(
            machine_id,
            line_id,
            _iso(date_from),
            _iso(date_to),
            limit=limit,
            offset=offset,
            sort="asc",
            timeout=config.HISTORY_TIMEOUT_SECONDS,
        )
        items = page.get("items") or []
        if not isinstance(items, list):
            items = []
        for item in items:
            if isinstance(item, dict):
                rows.append(_row_to_training_dict(item))

        has_more = bool(page.get("has_more"))
        logging.info(
            "Raw history page offset=%s got=%s has_more=%s total_loaded=%s",
            offset,
            len(items),
            has_more,
            len(rows),
        )
        if not has_more or not items:
            break
        offset += limit

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["trend_date"] = pd.to_datetime(df["trend_date"], errors="coerce", utc=True)
    df = df.dropna(subset=["trend_date"]).sort_values("trend_date", ascending=True)
    return df.reset_index(drop=True)


def count_raw_sensor_rows(
    client: BackendClient | None = None,
    *,
    machine_id: str | None = None,
    line_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page_size: int | None = None,
) -> int:
    """Count Postgres raw rows in range (paginated; no full DataFrame kept)."""
    client = client or BackendClient()
    if machine_id is None or line_id is None:
        machine_id, line_id = resolve_history_context(client)
    if date_from is None or date_to is None:
        date_from, date_to = history_time_range()

    limit = page_size or config.RAW_PAGE_SIZE
    limit = max(1, min(int(limit), 10_000))
    offset = 0
    total = 0

    while True:
        page = client.get_machine_raw_page(
            machine_id,
            line_id,
            _iso(date_from),
            _iso(date_to),
            limit=limit,
            offset=offset,
            sort="asc",
            timeout=config.HISTORY_TIMEOUT_SECONDS,
        )
        items = page.get("items") or []
        n = len(items) if isinstance(items, list) else 0
        total += n
        if not page.get("has_more") or n == 0:
            break
        offset += limit

    return total
