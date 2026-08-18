"""HTTP client for backend APIs at BACKEND_BASE_URL."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import UUID

import requests

import config


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    return value


def _serialize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {k: _serialize(v) for k, v in payload.items() if v is not None}


class BackendClient:
    """Thin requests wrapper around backend ingest/read endpoints."""

    def __init__(self) -> None:
        self.base_url = config.BACKEND_BASE_URL
        self.timeout = config.BACKEND_TIMEOUT_SECONDS

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{self.base_url}{path}"

    def get(
        self,
        path: str,
        params: dict | None = None,
        *,
        allow_404: bool = False,
    ) -> Any:
        response = requests.get(
            self._url(path),
            params=params,
            timeout=self.timeout,
        )
        if response.status_code == 404 and allow_404:
            return None
        if response.status_code >= 400:
            logging.warning(
                "Backend GET %s failed: %s %s",
                path,
                response.status_code,
                response.text[:300],
            )
            response.raise_for_status()
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    def post(self, path: str, payload: dict[str, Any]) -> Any:
        body = _serialize_payload(payload)
        response = requests.post(
            self._url(path),
            json=body,
            timeout=self.timeout,
        )
        if response.status_code >= 400:
            logging.warning(
                "Backend POST %s failed: %s %s",
                path,
                response.status_code,
                response.text[:300],
            )
            response.raise_for_status()
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    # --- reads ---
    def list_machines(self) -> list[dict]:
        data = self.get("/machines")
        return data if isinstance(data, list) else []

    def list_production_runs(self, limit: int = 20) -> list[dict]:
        data = self.get("/production-run/", params={"limit": limit})
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and isinstance(data.get("value"), list):
            return data["value"]
        return []

    def get_current_production_run(self, machine_id: str, line_id: int) -> dict | None:
        return self.get(
            "/production-run/current",
            params={"machine_id": machine_id, "line_id": line_id},
            allow_404=True,
        )

    def get_baseline_registry(
        self,
        regime_type: str | None = None,
        feature_name: str | None = None,
        limit: int = 1000,
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit, "offset": 0}
        if regime_type:
            params["regime_type"] = regime_type
        if feature_name:
            params["feature_name"] = feature_name
        data = self.get("/baseline-registry", params=params)
        return data if isinstance(data, list) else []

    # --- writes ---
    def create_machine_raw(self, payload: dict) -> dict | None:
        return self.post("/machine-raw-data/", payload)

    def create_live_process_window(self, payload: dict) -> dict | None:
        return self.post("/live-process-windows", payload)

    def create_live_run_evaluation(self, payload: dict) -> dict | None:
        return self.post("/live-run-evaluations", payload)

    def create_live_feature_evaluation(self, payload: dict) -> dict | None:
        return self.post("/live-feature-evaluations", payload)
