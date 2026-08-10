"""Persist live_monitor outputs to backend Postgres via HTTP APIs."""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

from storage.backend_client import BackendClient
from storage.context_resolver import ContextResolver


def _iso(value: Any) -> Any:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return value


def _normalize_ml_anomaly_score(raw_score: Any) -> float | None:
    """Backend requires ml_anomaly_score in [0.0, 1.0]. IF scores are often negative."""
    if raw_score is None:
        return None
    try:
        score = float(raw_score)
    except (TypeError, ValueError):
        return None
    # IsolationForest: lower/negative => more anomalous → map via logistic(-score)
    intensity = 1.0 / (1.0 + math.exp(score))
    return max(0.0, min(1.0, round(intensity, 4)))


class BackendWriter:
    """Drop-in replacement for SQLite DBWriter used by the live pipeline."""

    def __init__(
        self,
        client: BackendClient | None = None,
        context: ContextResolver | None = None,
    ) -> None:
        self.client = client or BackendClient()
        self.context = context or ContextResolver(self.client)

    def _context_fields(self) -> dict[str, Any]:
        ctx = self.context.refresh_if_needed()
        return {
            "machine_id": ctx.get("machine_id"),
            "line_id": ctx.get("line_id"),
            "production_run_id": ctx.get("production_run_id"),
        }

    def save_raw_sensor(self, data_point: dict) -> None:
        """POST one raw poll to /machine-raw-data/."""
        try:
            ctx = self._context_fields()
            if not ctx.get("machine_id") or ctx.get("line_id") is None:
                logging.warning(
                    "Skip raw sensor save — missing machine_id/line_id (ctx=%s)",
                    ctx,
                )
                return
            timestamp = data_point.get("timestamp") or datetime.now(timezone.utc)
            payload = {
                "machine_id": ctx["machine_id"],
                "line_id": ctx["line_id"],
                "production_run_id": ctx.get("production_run_id"),
                "timestamp": _iso(timestamp),
                "val_1": data_point.get("screw_speed"),
                "val_5": data_point.get("load"),
                "val_6": data_point.get("pressure"),
                "val_7": data_point.get("temp_zone_7"),
                "val_8": data_point.get("temp_zone_8"),
                "val_9": data_point.get("temp_zone_9"),
                "val_10": data_point.get("temp_zone_10"),
                "val_11": data_point.get("temp_zone_11"),
                "val_27": data_point.get("temp_zone_27"),
                "val_28": data_point.get("temp_zone_28"),
                "val_29": data_point.get("temp_zone_29"),
                "val_30": data_point.get("temp_zone_30"),
                "val_31": data_point.get("temp_zone_31"),
                "val_32": data_point.get("temp_zone_32"),
                "val_2": data_point.get("Val_2"),
                "val_3": data_point.get("Val_3"),
                "val_4": data_point.get("Val_4"),
                "val_19": data_point.get("Val_19"),
                "val_20": data_point.get("Val_20"),
                "val_33": data_point.get("Val_33"),
            }
            self.client.create_machine_raw(payload)
        except Exception as exc:
            logging.warning("Failed to save raw sensor to backend: %s", exc)

    def save_live_process_window(self, features: dict, state_info: dict):
        """POST window to /live-process-windows; return SimpleNamespace with .id."""
        try:
            ctx = self._context_fields()
            payload = {
                **ctx,
                "window_start": _iso(features.get("window_start")),
                "window_end": _iso(features.get("window_end")),
                "row_count": features.get("row_count", 0),
                "valid_fraction": features.get("valid_fraction", 1.0),
                "invalid_fraction": features.get("invalid_fraction", 0.0),
                "outlier_fraction": features.get("outlier_fraction", 0.0),
                "avg_pressure": features.get("pressure_mean"),
                "avg_speed": features.get("screw_speed_mean"),
                "avg_temp": features.get("temperature_mean"),
                "avg_load": features.get("load_mean"),
                "min_pressure": features.get("pressure_min"),
                "max_pressure": features.get("pressure_max"),
                "min_speed": features.get("screw_speed_min"),
                "max_speed": features.get("screw_speed_max"),
                "pressure_std": features.get("pressure_std"),
                "speed_std": features.get("screw_speed_std"),
                "temp_std": features.get("temperature_std"),
                "pressure_range": features.get("pressure_range"),
                "speed_range": features.get("screw_speed_range"),
                "temp_range": features.get("temperature_range"),
                "pressure_slope": features.get("pressure_trend"),
                "speed_slope": features.get("screw_speed_trend"),
                "temp_slope": features.get("temperature_trend"),
                "pressure_per_rpm": features.get("pressure_per_rpm"),
                "temp_spread": features.get("temp_spread"),
                "load_per_pressure": features.get("load_per_pressure"),
                "candidate_state": state_info.get("candidate_state"),
                "confirmed_state": state_info.get("confirmed_state"),
                "confirmation_count": state_info.get("confirmation_count", 0),
            }
            created = self.client.create_live_process_window(payload)
            if not created or created.get("id") is None:
                logging.warning("Backend returned no live_process_window id")
                return None
            window = SimpleNamespace(**created)
            logging.info(
                "LiveProcessWindow saved to backend: id=%s state=%s",
                window.id,
                getattr(window, "confirmed_state", None),
            )
            return window
        except Exception as exc:
            logging.warning("Failed to save LiveProcessWindow to backend: %s", exc)
            return None

    def save_live_run_evaluation(self, evaluation: Any) -> Any | None:
        """POST /live-run-evaluations including ml_* fields supported by backend."""
        try:
            ctx = self._context_fields()
            payload = {
                **ctx,
                "live_process_window_id": getattr(evaluation, "live_process_window_id", None),
                "detected_state": getattr(evaluation, "detected_state", None),
                "active_regime": getattr(evaluation, "active_regime", None),
                "matched_profile_id": getattr(evaluation, "matched_profile_id", None),
                "baseline_id": getattr(evaluation, "baseline_id", None),
                "baseline_selection_method": getattr(
                    evaluation, "baseline_selection_method", None
                ),
                "evaluation_status": getattr(evaluation, "evaluation_status", None),
                "overall_status": getattr(evaluation, "overall_status", None),
                "stability_status": getattr(evaluation, "stability_status", None),
                "drift_score": getattr(evaluation, "drift_score", None),
                "anomaly_score": getattr(evaluation, "anomaly_score", None),
                "explanation_text": getattr(evaluation, "explanation_text", None),
                "ml_anomaly_score": _normalize_ml_anomaly_score(
                    getattr(evaluation, "ml_anomaly_score", None)
                ),
                "ml_is_anomaly": getattr(evaluation, "ml_is_anomaly", None),
                "ml_model_status": getattr(evaluation, "ml_model_status", None),
            }
            created = self.client.create_live_run_evaluation(payload)
            if not created or created.get("id") is None:
                return None
            saved = SimpleNamespace(**created)
            logging.info(
                "LiveRunEvaluation saved to backend: id=%s status=%s ml_anomaly=%s",
                saved.id,
                getattr(saved, "overall_status", None),
                getattr(saved, "ml_is_anomaly", None),
            )
            return saved
        except Exception as exc:
            logging.warning("Failed to save LiveRunEvaluation to backend: %s", exc)
            return None

    def save_feature_evaluations(
        self,
        results: list[Any],
        live_run_evaluation_id: int | None = None,
    ) -> bool:
        """POST each feature row to /live-feature-evaluations (once, with run id)."""
        if not results:
            return True
        ok = True
        for row in results:
            try:
                payload = {
                    "live_process_window_id": getattr(row, "live_process_window_id", None),
                    "live_run_evaluation_id": live_run_evaluation_id
                    or getattr(row, "live_run_evaluation_id", None),
                    "feature_name": getattr(row, "feature_name", None),
                    "current_value": getattr(row, "current_value", None),
                    "baseline_id": getattr(row, "baseline_id", None),
                    "baseline_mean": getattr(row, "baseline_mean", None),
                    "baseline_std": getattr(row, "baseline_std", None),
                    "baseline_warning_low": getattr(row, "baseline_warning_low", None),
                    "baseline_warning_high": getattr(row, "baseline_warning_high", None),
                    "baseline_critical_low": getattr(row, "baseline_critical_low", None),
                    "baseline_critical_high": getattr(row, "baseline_critical_high", None),
                    "deviation_abs": getattr(row, "deviation_abs", None),
                    "deviation_pct": getattr(row, "deviation_pct", None),
                    "z_score": getattr(row, "z_score", None),
                    "feature_status": getattr(row, "feature_status", None),
                }
                created = self.client.create_live_feature_evaluation(payload)
                if created and created.get("id") is not None:
                    row.id = created["id"]
                    row.live_run_evaluation_id = payload.get("live_run_evaluation_id")
            except Exception as exc:
                ok = False
                logging.warning("Failed to save feature evaluation to backend: %s", exc)
        if ok:
            logging.info("Feature evaluations saved to backend: %s features", len(results))
        return ok
