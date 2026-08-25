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

    def get_machine_raw_page(
        self,
        machine_id: str,
        line_id: int,
        date_from: str,
        date_to: str,
        *,
        limit: int = 1000,
        offset: int = 0,
        sort: str = "asc",
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """Paginated GET /machine-raw-data/ for training history."""
        response = requests.get(
            self._url("/machine-raw-data/"),
            params={
                "machine_id": machine_id,
                "line_id": line_id,
                "datefrom": date_from,
                "dateTo": date_to,
                "limit": limit,
                "offset": offset,
                "sort": sort,
            },
            timeout=timeout if timeout is not None else self.timeout,
        )
        if response.status_code >= 400:
            logging.warning(
                "Backend GET /machine-raw-data/ failed: %s %s",
                response.status_code,
                response.text[:300],
            )
            response.raise_for_status()
        data = response.json() if response.content else {}
        return data if isinstance(data, dict) else {"items": [], "has_more": False}

    def list_live_process_windows(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        production_run_id: int | None = None,
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if production_run_id is not None:
            params["production_run_id"] = production_run_id
        data = self.get("/live-process-windows", params=params)
        return data if isinstance(data, list) else []

    def list_live_run_evaluations(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        live_process_window_id: int | None = None,
        production_run_id: int | None = None,
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if live_process_window_id is not None:
            params["live_process_window_id"] = live_process_window_id
        if production_run_id is not None:
            params["production_run_id"] = production_run_id
        data = self.get("/live-run-evaluations", params=params)
        return data if isinstance(data, list) else []

    def list_live_feature_evaluations(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        live_run_evaluation_id: int | None = None,
        live_process_window_id: int | None = None,
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if live_run_evaluation_id is not None:
            params["live_run_evaluation_id"] = live_run_evaluation_id
        if live_process_window_id is not None:
            params["live_process_window_id"] = live_process_window_id
        data = self.get("/live-feature-evaluations", params=params)
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

    def create_baseline_registry(self, payload: dict) -> dict | None:
        return self.post("/baseline-registry", payload)
