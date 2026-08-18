# Feature Evaluator — compares live features against selected baseline
#               calculates z-score, deviation, and assigns feature status
#               one result row per feature posted to backend live_feature_evaluation

import logging
import math
from types import SimpleNamespace

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


class FeatureEvaluator:
    def __init__(self, writer: BackendWriter | None = None):
        self.writer = writer

    def evaluate(self, features, baseline_records, live_window_id) -> list:
        baseline_map = {}
        for record in baseline_records:
            baseline_map[record.feature_name] = record

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
            deviation_abs = current_value - mean_value
            deviation_pct = (deviation_abs / mean_value * 100) if mean_value != 0 else 0.0
            z_score = (
                (deviation_abs / std_value) if std_value and std_value > 0 else 0.0
            )

            abs_z = abs(z_score)
            if abs_z < 1.5:
                feature_status = "NORMAL"
            elif abs_z < 2.5:
                feature_status = "WARNING"
            else:
                feature_status = "CRITICAL"

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
                    baseline_warning_low=getattr(baseline, "warning_low", None),
                    baseline_warning_high=getattr(baseline, "warning_high", None),
                    baseline_critical_low=getattr(baseline, "critical_low", None),
                    baseline_critical_high=getattr(baseline, "critical_high", None),
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
