"""Shared helpers for setup-wizard data connectors."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


FORBIDDEN_SQL = (
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "merge",
    "exec",
    "execute",
    "xp_",
    "sp_",
    "grant",
    "revoke",
    "create",
    ";",
    "--",
    "/*",
)


def assert_safe_select(query: str) -> str:
    q = (query or "").strip()
    if not q:
        raise ValueError("SQL query is required")
    lowered = q.lower().lstrip()
    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise ValueError("Only SELECT/WITH queries are allowed")
    for token in FORBIDDEN_SQL:
        if token == ";" and ";" in q.rstrip().rstrip(";"):
            # Allow a single trailing semicolon
            if q.rstrip().endswith(";") and q.rstrip()[:-1].count(";") == 0:
                continue
            raise ValueError("Multiple statements are not allowed")
        if token in (";", "--", "/*"):
            continue
        if f" {token} " in f" {lowered} " or lowered.startswith(f"{token} "):
            if token in ("with",):
                continue
            raise ValueError(f"Forbidden SQL keyword: {token}")
    return q.rstrip().rstrip(";")


def apply_field_mapping(
    raw_rows: Sequence[Dict[str, Any]],
    field_mapping: Dict[str, str],
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Map raw connector columns -> ZITTA canonical fields.
    field_mapping: {canonical_field: source_column}
    Preview tables show canonical keys for readability.
    """
    mapping = {k: v for k, v in (field_mapping or {}).items() if k and v}
    if not mapping:
        # Identity map from first row keys
        if not raw_rows:
            return [], []
        keys = list(raw_rows[0].keys())
        return keys, [dict(r) for r in raw_rows]

    columns = list(mapping.keys())
    mapped: List[Dict[str, Any]] = []
    for row in raw_rows:
        out: Dict[str, Any] = {}
        for canonical, source_col in mapping.items():
            val = row.get(source_col)
            if val is None:
                # case-insensitive fallback
                lower_map = {str(k).lower(): v for k, v in row.items()}
                val = lower_map.get(str(source_col).lower())
            out[canonical] = val
        mapped.append(out)
    return columns, mapped


def parse_timestamp(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except ValueError:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d.%m.%Y %H:%M:%S", "%d.%m.%Y"):
            try:
                return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def filter_by_history_days(
    rows: Sequence[Dict[str, Any]],
    *,
    days: int,
    timestamp_field: str = "timestamp",
) -> List[Dict[str, Any]]:
    if days <= 0:
        return list(rows)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    kept: List[Dict[str, Any]] = []
    for row in rows:
        ts = parse_timestamp(row.get(timestamp_field))
        if ts is None:
            kept.append(row)  # keep untimestamped rather than drop silently
            continue
        if ts >= cutoff:
            kept.append(row)
    return kept


def compute_quality_ratios(
    rows: Sequence[Dict[str, Any]],
    *,
    required_fields: Optional[Iterable[str]] = None,
    timestamp_field: str = "timestamp",
    stale_hours: float = 48.0,
) -> Dict[str, float]:
    if not rows:
        return {
            "missing_values_ratio": 1.0,
            "stale_ratio": 1.0,
            "duplicate_ratio": 0.0,
            "invalid_ratio": 1.0,
            "availability_ratio": 0.0,
        }

    fields = list(required_fields) if required_fields else list(rows[0].keys())
    total_cells = max(1, len(rows) * max(1, len(fields)))
    missing = 0
    invalid = 0
    for row in rows:
        for f in fields:
            val = row.get(f)
            if val is None or val == "":
                missing += 1
                continue
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                if val != val:  # NaN
                    invalid += 1

    # duplicate fingerprint on full mapped row
    fingerprints = [tuple(sorted((k, str(v)) for k, v in row.items())) for row in rows]
    unique = len(set(fingerprints))
    duplicate_ratio = max(0.0, 1.0 - (unique / max(1, len(rows))))

    now = datetime.now(timezone.utc)
    stale = 0
    timed = 0
    for row in rows:
        ts = parse_timestamp(row.get(timestamp_field))
        if ts is None:
            continue
        timed += 1
        age_h = (now - ts).total_seconds() / 3600.0
        if age_h > stale_hours:
            stale += 1
    stale_ratio = (stale / timed) if timed else 0.15

    missing_ratio = missing / total_cells
    invalid_ratio = invalid / total_cells
    availability = min(1.0, len(rows) / max(5, len(rows)))  # present sample => available
    if len(rows) >= 1:
        availability = max(0.7, 1.0 - missing_ratio * 0.5)

    return {
        "missing_values_ratio": round(missing_ratio, 4),
        "stale_ratio": round(stale_ratio, 4),
        "duplicate_ratio": round(duplicate_ratio, 4),
        "invalid_ratio": round(invalid_ratio, 4),
        "availability_ratio": round(availability, 4),
    }


def extract_row_meta(mapped_row: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    ts = mapped_row.get("timestamp") or mapped_row.get("measured_at") or mapped_row.get("reading_at")
    machine = mapped_row.get("machine_id")
    ts_parsed = parse_timestamp(ts)
    ts_str = ts_parsed.isoformat() if ts_parsed else (str(ts) if ts else None)
    return ts_str, str(machine) if machine is not None else None
