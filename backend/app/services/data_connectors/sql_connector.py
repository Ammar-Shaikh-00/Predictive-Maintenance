"""SQL connector (MSSQL SELECT) for setup wizard."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Tuple

from app.services.data_connectors.common import (
    apply_field_mapping,
    assert_safe_select,
    filter_by_history_days,
)


def _resolve_mssql_config(connection: Dict[str, Any], saved: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    use_saved = bool(connection.get("use_saved_mssql", True))
    base = dict(saved or {}) if use_saved else {}
    for key in ("host", "port", "username", "password", "database"):
        if connection.get(key) not in (None, "", "********"):
            base[key] = connection[key]
    if not base.get("host") or not base.get("username"):
        raise ValueError(
            "MSSQL host/username required. Enable Connections → MSSQL or provide inline credentials."
        )
    if not base.get("password"):
        raise ValueError("MSSQL password is required")
    base.setdefault("port", 1433)
    base.setdefault("database", "HISTORISCH")
    return base


def _fetch_sync(cfg: Dict[str, Any], query: str, limit: int) -> List[Dict[str, Any]]:
    import pymssql

    safe = assert_safe_select(query)
    # Wrap with TOP if not already limited and query is simple SELECT
    q = safe
    lowered = q.lower()
    if " top " not in lowered and limit > 0 and lowered.lstrip().startswith("select"):
        # INSERT TOP after SELECT
        parts = q.split(None, 1)
        if len(parts) == 2:
            q = f"{parts[0]} TOP {int(limit)} {parts[1]}"

    conn = pymssql.connect(
        server=cfg["host"],
        user=cfg["username"],
        password=cfg["password"],
        database=cfg.get("database") or "HISTORISCH",
        port=int(cfg.get("port") or 1433),
        login_timeout=8,
        timeout=30,
    )
    try:
        try:
            conn.autocommit(True)
        except Exception:
            pass
        cur = conn.cursor(as_dict=True)
        try:
            cur.execute("SET NOCOUNT ON")
        except Exception:
            pass
        cur.execute(q)
        rows = cur.fetchmany(limit) if limit > 0 else cur.fetchall()
        out: List[Dict[str, Any]] = []
        for row in rows or []:
            out.append({str(k): v for k, v in dict(row).items()})
        return out
    finally:
        conn.close()


async def fetch_sql_rows(
    connection: Dict[str, Any],
    *,
    field_mapping: Dict[str, str],
    saved_mssql: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = 200,
    history_days: Optional[int] = None,
) -> Tuple[List[str], List[Dict[str, Any]], str]:
    cfg = _resolve_mssql_config(connection, saved_mssql)
    query = connection.get("query") or connection.get("sql")
    if not query:
        table = connection.get("table") or (saved_mssql or {}).get("table") or "Tab_Actual"
        # Safe identifier-ish table name
        if not str(table).replace("_", "").replace(".", "").isalnum():
            raise ValueError("Invalid table name")
        query = f"SELECT * FROM {table} ORDER BY 1 DESC"

    fetch_limit = int(limit or 200)
    if history_days and fetch_limit < 5000:
        fetch_limit = min(5000, max(fetch_limit, history_days * 48))

    raw = await asyncio.to_thread(_fetch_sync, cfg, query, fetch_limit)
    columns, mapped = apply_field_mapping(raw, field_mapping)
    if history_days:
        mapped = filter_by_history_days(mapped, days=history_days)
    if limit is not None:
        mapped = mapped[: int(limit)]
    return columns, mapped, "LIVE"
