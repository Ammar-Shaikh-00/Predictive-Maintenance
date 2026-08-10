"""CSV / Excel-text connector for setup wizard."""

from __future__ import annotations

import csv
import io
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.services.data_connectors.common import apply_field_mapping, filter_by_history_days


def _read_text_from_settings(connection: Dict[str, Any]) -> str:
    if connection.get("csv_text"):
        return str(connection["csv_text"])
    path = connection.get("file_path") or connection.get("upload_path")
    if path:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"CSV file not found: {path}")
        return p.read_text(encoding="utf-8-sig", errors="replace")
    raise ValueError(
        "CSV connection requires csv_text or an uploaded file_path. "
        "Upload a file in step 1 or paste CSV text."
    )


def parse_csv_text(
    text: str,
    *,
    delimiter: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    sample = text[:4096]
    if delimiter:
        dialect_delim = delimiter
    else:
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            dialect_delim = dialect.delimiter
        except csv.Error:
            dialect_delim = ","

    reader = csv.DictReader(io.StringIO(text), delimiter=dialect_delim)
    rows: List[Dict[str, Any]] = []
    for i, row in enumerate(reader):
        cleaned = {str(k).strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items() if k}
        rows.append(cleaned)
        if limit is not None and len(rows) >= limit:
            break
    return rows


def fetch_csv_rows(
    connection: Dict[str, Any],
    *,
    field_mapping: Dict[str, str],
    limit: Optional[int] = None,
    history_days: Optional[int] = None,
) -> Tuple[List[str], List[Dict[str, Any]], str]:
    text = _read_text_from_settings(connection)
    delimiter = connection.get("delimiter")
    raw = parse_csv_text(text, delimiter=delimiter, limit=None if history_days else limit)
    columns, mapped = apply_field_mapping(raw, field_mapping)
    if history_days:
        mapped = filter_by_history_days(mapped, days=history_days)
    if limit is not None:
        mapped = mapped[:limit]
    return columns, mapped, "LIVE"
