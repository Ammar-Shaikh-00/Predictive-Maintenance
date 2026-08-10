"""Dispatch setup-wizard connectors: CSV, SQL, API (+ manual paste)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.services.data_connectors import api_connector, csv_connector, sql_connector
from app.services.data_connectors.common import compute_quality_ratios


async def fetch_connector_rows(
    *,
    source_type: str,
    connection: Dict[str, Any],
    field_mapping: Dict[str, str],
    saved_mssql: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = 50,
    history_days: Optional[int] = None,
) -> Tuple[List[str], List[Dict[str, Any]], str]:
    st = (source_type or "csv").lower().strip()
    conn = dict(connection or {})

    if st in ("csv", "excel", "manual", "lab"):
        # excel/manual/lab: treat as CSV text or uploaded file
        return csv_connector.fetch_csv_rows(
            conn,
            field_mapping=field_mapping,
            limit=limit,
            history_days=history_days,
        )

    if st == "sql":
        return await sql_connector.fetch_sql_rows(
            conn,
            field_mapping=field_mapping,
            saved_mssql=saved_mssql,
            limit=limit,
            history_days=history_days,
        )

    if st == "api":
        return await api_connector.fetch_api_rows(
            conn,
            field_mapping=field_mapping,
            limit=limit,
            history_days=history_days,
        )

    raise ValueError(f"Unsupported source_type: {source_type}")


def quality_ratios_from_rows(
    rows: List[Dict[str, Any]],
    field_mapping: Dict[str, str],
) -> Dict[str, float]:
    return compute_quality_ratios(rows, required_fields=list(field_mapping.keys()) or None)
