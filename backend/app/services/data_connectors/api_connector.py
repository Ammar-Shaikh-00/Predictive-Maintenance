"""HTTP API connector for setup wizard."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.services.data_connectors.common import apply_field_mapping, filter_by_history_days


def _dig(data: Any, path: Optional[str]) -> Any:
    if not path:
        return data
    cur = data
    for part in str(path).split("."):
        if part == "":
            continue
        if isinstance(cur, dict):
            cur = cur.get(part)
        elif isinstance(cur, list) and part.isdigit():
            cur = cur[int(part)]
        else:
            return None
    return cur


def _as_row_list(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, list):
        return [dict(x) if isinstance(x, dict) else {"value": x} for x in payload]
    if isinstance(payload, dict):
        for key in ("data", "rows", "items", "results", "records"):
            if isinstance(payload.get(key), list):
                return _as_row_list(payload[key])
        return [payload]
    return [{"value": payload}]


async def fetch_api_rows(
    connection: Dict[str, Any],
    *,
    field_mapping: Dict[str, str],
    limit: Optional[int] = 200,
    history_days: Optional[int] = None,
) -> Tuple[List[str], List[Dict[str, Any]], str]:
    url = (connection.get("url") or "").strip()
    if not url:
        raise ValueError("API connection requires url")
    method = str(connection.get("method") or "GET").upper()
    headers = dict(connection.get("headers") or {})
    params = dict(connection.get("params") or {})
    body = connection.get("body")
    json_path = connection.get("json_path")
    timeout = float(connection.get("timeout_seconds") or 20)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.request(method, url, headers=headers, params=params, json=body)
        resp.raise_for_status()
        try:
            payload = resp.json()
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"API response is not JSON: {exc}") from exc

    extracted = _dig(payload, json_path) if json_path else payload
    raw = _as_row_list(extracted)
    columns, mapped = apply_field_mapping(raw, field_mapping)
    if history_days:
        mapped = filter_by_history_days(mapped, days=history_days)
    if limit is not None:
        mapped = mapped[: int(limit)]
    return columns, mapped, "LIVE"
