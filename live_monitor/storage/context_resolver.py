"""Resolve machine_id / line_id / production_run_id from backend APIs."""

from __future__ import annotations

import logging
import time
from typing import Any

import config
from storage.backend_client import BackendClient


class ContextResolver:
    """Caches machine/line/run context refreshed from backend."""

    def __init__(self, client: BackendClient | None = None) -> None:
        self.client = client or BackendClient()
        self._machine_id: str | None = config.MACHINE_ID
        self._line_id: int | None = config.LINE_ID
        self._production_run_id: int | None = None
        self._profile_id: int | str | None = None
        self._material_name: str | None = None
        self._last_refresh = 0.0

    @property
    def machine_id(self) -> str | None:
        return self._machine_id

    @property
    def line_id(self) -> int | None:
        return self._line_id

    @property
    def production_run_id(self) -> int | None:
        return self._production_run_id

    @property
    def profile_id(self) -> int | str | None:
        return self._profile_id

    @property
    def material_name(self) -> str | None:
        return self._material_name

    def refresh_if_needed(self, force: bool = False) -> dict[str, Any]:
        now = time.time()
        if (
            not force
            and self._machine_id
            and self._line_id is not None
            and (now - self._last_refresh) < config.CONTEXT_REFRESH_SECONDS
        ):
            return self.as_dict()

        try:
            self._resolve_machine()
            self._resolve_line_and_run()
            self._last_refresh = now
        except Exception as exc:
            logging.warning("Context resolve failed: %s", exc)

        return self.as_dict()

    def as_dict(self) -> dict[str, Any]:
        return {
            "machine_id": self._machine_id,
            "line_id": self._line_id,
            "production_run_id": self._production_run_id,
            "profile_id": self._profile_id,
            "material_name": self._material_name,
        }

    def _resolve_machine(self) -> None:
        if self._machine_id:
            return

        machines = self.client.list_machines()
        if not machines:
            logging.warning("No machines returned from backend /machines")
            return

        selected = None
        if config.MACHINE_NAME:
            needle = config.MACHINE_NAME.lower()
            for machine in machines:
                name = str(machine.get("name") or "").lower()
                if needle in name:
                    selected = machine
                    break
        if selected is None:
            # Prefer Extruder if present
            for machine in machines:
                if "extruder" in str(machine.get("name") or "").lower():
                    selected = machine
                    break
        if selected is None:
            selected = machines[0]

        self._machine_id = str(selected.get("id")) if selected.get("id") else None
        logging.info(
            "Resolved machine_id=%s name=%s",
            self._machine_id,
            selected.get("name"),
        )

    def _resolve_line_and_run(self) -> None:
        if not self._machine_id:
            return

        # Prefer explicit RUNNING run for this machine (has correct line_id)
        runs = self.client.list_production_runs(limit=20)
        running = None
        for run in runs:
            if str(run.get("machine_id")) != str(self._machine_id):
                continue
            if str(run.get("status") or "").upper() == "RUNNING":
                running = run
                break

        if running:
            if self._line_id is None and running.get("line_id") is not None:
                self._line_id = int(running["line_id"])
            if running.get("id") is not None:
                self._production_run_id = int(running["id"])
            self._apply_profile_from_run(running)
            logging.info(
                "Resolved from RUNNING run id=%s line_id=%s profile_id=%s material=%s",
                self._production_run_id,
                self._line_id,
                self._profile_id,
                self._material_name,
            )
            return

        # Fallback: config line_id + /production-run/current
        if self._line_id is None:
            # last resort: most recent run for this machine
            for run in runs:
                if str(run.get("machine_id")) == str(self._machine_id) and run.get("line_id") is not None:
                    self._line_id = int(run["line_id"])
                    break
            if self._line_id is None:
                self._line_id = 1
                logging.warning("No line_id found; defaulting to 1")

        try:
            run = self.client.get_current_production_run(
                machine_id=self._machine_id,
                line_id=self._line_id,
            )
        except Exception as exc:
            logging.warning("Could not fetch current production run: %s", exc)
            return

        if not run:
            self._production_run_id = None
            self._profile_id = None
            self._material_name = None
            return

        run_id = run.get("id")
        self._production_run_id = int(run_id) if run_id is not None else None
        if run.get("line_id") is not None:
            self._line_id = int(run["line_id"])
        self._apply_profile_from_run(run)

    def _apply_profile_from_run(self, run: dict) -> None:
        """Capture profile/material fields used by PROFILE baseline selection."""
        self._material_name = (
            str(run.get("material_name")).strip()
            if run.get("material_name")
            else None
        )
        raw = (
            run.get("profile_id")
            if run.get("profile_id") is not None
            else run.get("material_profile_id")
        )
        if raw is None or raw == "":
            self._profile_id = None
            return
        # baseline_registry.profile_id is typically int; keep UUID string if needed
        try:
            self._profile_id = int(raw)
        except (TypeError, ValueError):
            self._profile_id = str(raw)