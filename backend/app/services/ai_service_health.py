"""Live probe of AI_SERVICE_URL/health — used for honest KI-Server digitalization."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx

from app.core.config import get_settings

_HEALTHY_STATUSES = {"ok", "healthy", "operational", "up", "running", "alive"}
_UNHEALTHY_STATUSES = {"unavailable", "unhealthy", "down", "error", "fail", "failed"}
_CACHE_TTL_SECONDS = 15.0
_cache: Dict[str, Any] = {"at": 0.0, "result": None}


@dataclass(frozen=True)
class AiServiceHealth:
    healthy: bool
    status: str
    url: str
    http_status: Optional[int] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


def clear_ai_health_cache() -> None:
    _cache["at"] = 0.0
    _cache["result"] = None


def interpret_ai_health_response(
    http_status: Optional[int],
    body: Any = None,
) -> bool:
    if http_status != 200:
        return False
    if not isinstance(body, dict):
        return True
    raw = str(body.get("status") or "").strip().lower()
    if not raw:
        return True
    if raw in _UNHEALTHY_STATUSES:
        return False
    if raw in _HEALTHY_STATUSES:
        return True
    return False


def apply_ai_server_to_sources(
    connected_sources: Iterable[str],
    missing_sources: Iterable[str],
    *,
    healthy: bool,
    progress_fn,
) -> Tuple[List[str], List[str], float]:
    connected = [k for k in connected_sources if k and k != "ai_server"]
    missing = [k for k in missing_sources if k and k != "ai_server"]
    if healthy:
        connected.append("ai_server")
    else:
        missing.append("ai_server")
    connected = sorted(set(connected))
    missing = sorted(set(missing))
    return connected, missing, float(progress_fn(connected))


async def probe_ai_service_health(*, force: bool = False) -> AiServiceHealth:
    now = time.monotonic()
    cached = _cache.get("result")
    if (
        not force
        and cached is not None
        and (now - float(_cache.get("at") or 0)) < _CACHE_TTL_SECONDS
    ):
        return cached

    settings = get_settings()
    base = str(settings.ai_service_url or "").rstrip("/")
    url = f"{base}/health" if base else ""
    if not base:
        result = AiServiceHealth(
            healthy=False,
            status="unconfigured",
            url=url,
            error="AI_SERVICE_URL is empty",
        )
        _cache["at"] = now
        _cache["result"] = result
        return result

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url)
        body: Any = None
        try:
            body = response.json()
        except Exception:
            body = None
        healthy = interpret_ai_health_response(response.status_code, body)
        status = "ok" if healthy else "unhealthy"
        if isinstance(body, dict) and body.get("status"):
            status = str(body.get("status"))
        result = AiServiceHealth(
            healthy=healthy,
            status=status,
            url=url,
            http_status=response.status_code,
            details=body if isinstance(body, dict) else None,
        )
    except Exception as exc:
        result = AiServiceHealth(
            healthy=False,
            status="unreachable",
            url=url,
            error=str(exc),
        )

    _cache["at"] = now
    _cache["result"] = result
    return result
