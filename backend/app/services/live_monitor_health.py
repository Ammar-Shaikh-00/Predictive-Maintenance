"""Live probe of AI_SERVICE_URL/health — ML serving facts for the capability scorecard."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings

_CACHE_TTL_SECONDS = 15.0
_cache: Dict[str, Any] = {"at": 0.0, "result": None, "url": None}

_DOCKER_HOSTS = frozenset({"live-monitor", "live-monitor-dev"})
# Same edge host as .github/workflows/deploy.yml health check.
_EDGE_BASES = ("http://100.119.197.81:9003",)
_LOCAL_BASES = (
    "http://127.0.0.1:8001",
    "http://127.0.0.1:9003",
    "http://localhost:8001",
    "http://localhost:9003",
    "http://host.docker.internal:8001",
    "http://host.docker.internal:9003",
)
_DOCKER_BASES = (
    "http://live-monitor:9003",
    "http://live-monitor-dev:9003",
)


@dataclass(frozen=True)
class LiveMonitorHealth:
    reachable: bool
    status: str
    url: str
    http_status: Optional[int] = None
    pipeline: bool = False
    classifier_loaded: Optional[bool] = None
    drift_baseline_loaded: Optional[bool] = None
    ml_models_loaded: List[str] = field(default_factory=list)
    models_expected: int = 6
    prediction_readiness: Optional[float] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


def clear_live_monitor_health_cache() -> None:
    _cache["at"] = 0.0
    _cache["result"] = None
    _cache["url"] = None


def _running_in_docker() -> bool:
    return Path("/.dockerenv").exists()


def _hostname(url: str) -> str:
    return str(urlparse(url).hostname or "").lower()


def candidate_live_monitor_urls(configured: str = "") -> List[str]:
    """AI_SERVICE_URL first, then local/docker live-monitor fallbacks."""
    urls: List[str] = []
    for raw in str(configured or "").split(","):
        base = raw.strip().rstrip("/")
        if base:
            urls.append(base)
    urls.extend(_LOCAL_BASES)
    urls.extend(_EDGE_BASES)
    if _running_in_docker():
        urls.extend(_DOCKER_BASES)
    else:
        # Avoid Windows DNS waits for compose hostnames that do not exist on the host.
        for base in _DOCKER_BASES:
            host = _hostname(base)
            if host and host not in _DOCKER_HOSTS:
                urls.append(base)
    seen = set()
    unique: List[str] = []
    for url in urls:
        key = url.rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        unique.append(key)
    last = _cache.get("url")
    if last and last in unique:
        unique.remove(last)
        unique.insert(0, last)
    return unique


def _as_model_names(raw: Any) -> List[str]:
    if isinstance(raw, list):
        names: List[str] = []
        for item in raw:
            if item is None:
                continue
            names.append(str(item).strip())
        return [n for n in names if n]
    if isinstance(raw, str):
        return [part.strip() for part in raw.split(",") if part.strip()]
    return []


def parse_live_monitor_health(
    *,
    url: str,
    http_status: Optional[int],
    body: Any,
    error: Optional[str] = None,
) -> LiveMonitorHealth:
    details = body if isinstance(body, dict) else None
    models: List[str] = []
    expected = 6
    classifier: Optional[bool] = None
    drift: Optional[bool] = None
    pipeline = False
    readiness = None
    if details:
        models = _as_model_names(
            details.get("ml_models_loaded") or details.get("anomaly_models")
        )
        exp = details.get("models_expected_count")
        if exp is None and isinstance(details.get("models_expected"), list):
            exp = len(details.get("models_expected") or [])
        if exp is None and models:
            exp = max(len(models), 6)
        if exp is not None:
            try:
                expected = int(exp)
            except (TypeError, ValueError):
                expected = 6
        if "state_classifier_loaded" in details or "classifier_loaded" in details:
            classifier = bool(
                details.get("state_classifier_loaded")
                if details.get("state_classifier_loaded") is not None
                else details.get("classifier_loaded")
            )
        if "drift_baseline_loaded" in details:
            drift = bool(details.get("drift_baseline_loaded"))
        layer = str(details.get("layer1_status") or details.get("status") or "").lower()
        pipeline = layer in {"ok", "active", "healthy", "running", "operational"}
        raw_ready = details.get("prediction_readiness")
        if raw_ready is not None:
            try:
                readiness = float(raw_ready)
            except (TypeError, ValueError):
                readiness = None
    reachable = http_status == 200
    return LiveMonitorHealth(
        reachable=reachable,
        status=str((details or {}).get("status") or ("ok" if reachable else "unhealthy")),
        url=url,
        http_status=http_status,
        pipeline=pipeline and reachable,
        classifier_loaded=classifier,
        drift_baseline_loaded=drift,
        ml_models_loaded=models,
        models_expected=expected,
        prediction_readiness=readiness,
        error=error,
        details=details,
    )


async def probe_live_monitor_health(*, force: bool = False) -> LiveMonitorHealth:
    now = time.monotonic()
    cached = _cache.get("result")
    if (
        not force
        and cached is not None
        and (now - float(_cache.get("at") or 0)) < _CACHE_TTL_SECONDS
    ):
        return cached

    settings = get_settings()
    bases = candidate_live_monitor_urls(
        str(getattr(settings, "ai_service_url", "") or "")
    )
    last_error: Optional[str] = None
    last_url = bases[0] if bases else ""
    timeout = httpx.Timeout(8.0, connect=1.2)

    async with httpx.AsyncClient(timeout=timeout) as client:
        for base in bases:
            url = f"{base}/health"
            last_url = url
            try:
                response = await client.get(url)
                body: Any = None
                try:
                    body = response.json()
                except Exception:
                    body = None
                if response.status_code != 200:
                    last_error = f"HTTP {response.status_code}"
                    continue
                result = parse_live_monitor_health(
                    url=url, http_status=response.status_code, body=body
                )
                _cache["at"] = now
                _cache["result"] = result
                _cache["url"] = base
                return result
            except Exception as exc:  # noqa: BLE001
                last_error = str(exc)
                continue

    result = LiveMonitorHealth(
        reachable=False,
        status="unreachable",
        url=last_url,
        error=last_error or "AI_SERVICE_URL unreachable",
    )
    _cache["at"] = now
    _cache["result"] = result
    return result
