# Feature Evaluator — compares live features against selected baseline
#               Status comes from baseline registry bands when present;
#               otherwise generic z-score thresholds from config (not per-feature).

import logging
import math
from types import SimpleNamespace

import config
from storage.backend_writer import BackendWriter

EVAL_FEATURES = [
    "screw_speed_mean",
    "pressure_mean",
    "temperature_mean",
    "load_mean",
    "pressure_per_rpm",
    "temp_spread",
    "load_per_pressure",
]


def _status_from_bands(
    current_value: float,
    warning_low,
    warning_high,
    critical_low,
    critical_high,
) -> str | None:
    """Use registry limits only — no feature-specific constants."""
    has_warn = warning_low is not None and warning_high is not None
    has_crit = critical_low is not None and critical_high is not None
    if not has_warn and not has_crit:
        return None

    if has_crit and (current_value < float(critical_low) or current_value > float(critical_high)):
        return "CRITICAL"
    if has_warn and (current_value < float(warning_low) or current_value > float(warning_high)):
        return "WARNING"
    if has_warn or has_crit:
        return "NORMAL"
    return None


def _status_from_z(abs_z: float) -> str:
    if abs_z < float(config.FEATURE_Z_WARNING):
        return "NORMAL"
    if abs_z < float(config.FEATURE_Z_CRITICAL):
        return "WARNING"
    return "CRITICAL"


class FeatureEvaluator:
    def __init__(self, writer: BackendWriter | None = None):
        self.writer = writer

    def evaluate(self, features, baseline_records, live_window_id) -> list:
        # Prefer newest registry row per feature (API usually returns id desc)
        baseline_map = {}
        for record in baseline_records or []:
            name = getattr(record, "feature_name", None)
            if not name:
                continue
            if name not in baseline_map:
                baseline_map[name] = record
            else:
                prev = baseline_map[name]
                prev_id = getattr(prev, "id", None) or 0
                cur_id = getattr(record, "id", None) or 0
                if cur_id > prev_id:
                    baseline_map[name] = record

        results = []

        for feature_name in EVAL_FEATURES:
            current_value = features.get(feature_name, None)

            if current_value is None or (
                isinstance(current_value, float) and math.isnan(current_value)
            ):
                results.append(
                    SimpleNamespace(
                        id=None,
                        live_process_window_id=live_window_id,
                        live_run_evaluation_id=None,
                        feature_name=feature_name,
                        current_value=None,
                        baseline_id=None,
                        baseline_mean=None,
                        baseline_std=None,
                        baseline_warning_low=None,
                        baseline_warning_high=None,
                        baseline_critical_low=None,
                        baseline_critical_high=None,
                        deviation_abs=None,
                        deviation_pct=None,
                        z_score=None,
                        feature_status="NOT_APPLICABLE",
                    )
                )
                continue

            baseline = baseline_map.get(feature_name, None)
            if baseline is None:
                results.append(
                    SimpleNamespace(
                        id=None,
                        live_process_window_id=live_window_id,
                        live_run_evaluation_id=None,
                        feature_name=feature_name,
                        current_value=current_value,
                        baseline_id=None,
                        baseline_mean=None,
                        baseline_std=None,
                        baseline_warning_low=None,
                        baseline_warning_high=None,
                        baseline_critical_low=None,
                        baseline_critical_high=None,
                        deviation_abs=None,
                        deviation_pct=None,
                        z_score=None,
                        feature_status="NOT_APPLICABLE",
                    )
                )
                continue

            mean_value = getattr(baseline, "mean_value", None) or 0.0
            std_value = getattr(baseline, "std_value", None)
            warning_low = getattr(baseline, "warning_low", None)
            warning_high = getattr(baseline, "warning_high", None)
            critical_low = getattr(baseline, "critical_low", None)
            critical_high = getattr(baseline, "critical_high", None)

            deviation_abs = current_value - mean_value
            deviation_pct = (deviation_abs / mean_value * 100) if mean_value != 0 else 0.0
            z_score = (
                (deviation_abs / std_value) if std_value and float(std_value) > 0 else 0.0
            )

            feature_status = _status_from_bands(
                current_value,
                warning_low,
                warning_high,
                critical_low,
                critical_high,
            )
            if feature_status is None:
                feature_status = _status_from_z(abs(z_score))

            results.append(
                SimpleNamespace(
                    id=None,
                    live_process_window_id=live_window_id,
                    live_run_evaluation_id=None,
                    feature_name=feature_name,
                    current_value=current_value,
                    baseline_id=getattr(baseline, "id", None),
                    baseline_mean=mean_value,
                    baseline_std=std_value,
                    baseline_warning_low=warning_low,
                    baseline_warning_high=warning_high,
                    baseline_critical_low=critical_low,
                    baseline_critical_high=critical_high,
                    deviation_abs=deviation_abs,
                    deviation_pct=deviation_pct,
                    z_score=z_score,
                    feature_status=feature_status,
                )
            )

        return results

    def save(self, results, live_run_evaluation_id=None) -> bool:
        if self.writer is None:
            logging.warning("FeatureEvaluator has no BackendWriter — skip save")
            return False
        return self.writer.save_feature_evaluations(
            results,
            live_run_evaluation_id=live_run_evaluation_id,
        )
