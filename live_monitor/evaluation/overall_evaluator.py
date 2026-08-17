# Overall Evaluator — takes per-feature results and produces
#               one final evaluation result for the current live window.
#               Writes result to backend live_run_evaluation.

import logging
import math
from types import SimpleNamespace

from evaluation.findings_builder import (
    build_findings,
    build_prediction_risks,
    format_explanation_text,
)
from storage.backend_writer import BackendWriter

CORE_FEATURES = {"pressure_mean", "screw_speed_mean", "temperature_mean", "pressure_per_rpm"}


class OverallEvaluator:
    def __init__(self, writer: BackendWriter | None = None):
        self.writer = writer

    def evaluate(
        self,
        feature_results,
        features,
        baseline_result,
        confirmed_state,
        live_window_id,
        ml_result=None,
        drift_result=None,
    ):
        baseline_result = baseline_result or {}

        if not feature_results:
            ml_score = ml_result.get("ml_anomaly_score") if ml_result else None
            ml_flag = ml_result.get("ml_is_anomaly") if ml_result else None
            ml_status = ml_result.get("ml_model_status") if ml_result else None
            overall = "WARNING" if ml_flag is True else "NORMAL"
            if drift_result and drift_result.get("drift_detected"):
                overall = "WARNING" if overall == "NORMAL" else overall

            findings = build_findings(
                confirmed_state=confirmed_state,
                overall_status=overall,
                stability_status=None,
                feature_results=[],
                ml_result=ml_result,
                drift_result=drift_result,
                baseline_result=baseline_result,
            )
            explanation = format_explanation_text(findings)

            return SimpleNamespace(
                id=None,
                live_process_window_id=live_window_id,
                detected_state=confirmed_state,
                active_regime=baseline_result.get("active_regime"),
                matched_profile_id=baseline_result.get("matched_profile_id"),
                baseline_id=None,
                baseline_selection_method=baseline_result.get("baseline_selection_method"),
                evaluation_status="EVALUATED",
                overall_status=overall,
                stability_status=None,
                drift_score=None,
                anomaly_score=None,
                explanation_text=explanation,
                findings=findings,
                predictions=build_prediction_risks(findings),
                ml_anomaly_score=ml_score,
                ml_is_anomaly=ml_flag,
                ml_model_status=ml_status,
            )

        status_map = {r.feature_name: r.feature_status for r in feature_results}
        core_statuses = [status_map.get(f, "NOT_APPLICABLE") for f in CORE_FEATURES]

        if "CRITICAL" in core_statuses:
            overall_status = "CRITICAL"
        elif "CRITICAL" in status_map.values():
            overall_status = "CRITICAL"
        elif "WARNING" in core_statuses:
            overall_status = "WARNING"
        elif "WARNING" in status_map.values():
            overall_status = "WARNING"
        else:
            overall_status = "NORMAL"

        if ml_result and ml_result.get("ml_is_anomaly") is True:
            if overall_status == "NORMAL":
                overall_status = "WARNING"

        if drift_result and drift_result.get("drift_detected"):
            if overall_status == "NORMAL":
                overall_status = "WARNING"

        speed_std = features.get("screw_speed_std", 0) or 0
        pressure_std = features.get("pressure_std", 0) or 0

        if speed_std > 10 or pressure_std > 20:
            stability_status = "UNSTABLE"
        elif speed_std > 5 or pressure_std > 10:
            stability_status = "TRANSITION"
        else:
            stability_status = "STABLE"

        z_scores = [
            abs(r.z_score)
            for r in feature_results
            if r.z_score is not None and not math.isnan(r.z_score)
        ]
        if z_scores:
            avg_z = sum(z_scores) / len(z_scores)
            drift_score = round(min(avg_z / 3.0, 1.0), 4)
        else:
            drift_score = 0.0

        evaluated = [
            r for r in feature_results if r.feature_status not in ("NOT_APPLICABLE", None)
        ]
        if evaluated:
            flagged = sum(
                1 for r in evaluated if r.feature_status in ("WARNING", "CRITICAL")
            )
            anomaly_score = round(flagged / len(evaluated), 4)
        else:
            anomaly_score = 0.0

        findings = build_findings(
            confirmed_state=confirmed_state,
            overall_status=overall_status,
            stability_status=stability_status,
            feature_results=feature_results,
            ml_result=ml_result,
            drift_result=drift_result,
            baseline_result=baseline_result,
        )
        explanation_text = format_explanation_text(findings)

        return SimpleNamespace(
            id=None,
            live_process_window_id=live_window_id,
            detected_state=confirmed_state,
            active_regime=baseline_result.get("active_regime"),
            matched_profile_id=baseline_result.get("matched_profile_id"),
            baseline_id=None,
            baseline_selection_method=baseline_result.get("baseline_selection_method"),
            evaluation_status="EVALUATED",
            overall_status=overall_status,
            stability_status=stability_status,
            drift_score=drift_score,
            anomaly_score=anomaly_score,
            explanation_text=explanation_text,
            findings=findings,
            predictions=build_prediction_risks(findings),
            ml_anomaly_score=ml_result.get("ml_anomaly_score") if ml_result else None,
            ml_is_anomaly=ml_result.get("ml_is_anomaly") if ml_result else None,
            ml_model_status=ml_result.get("ml_model_status") if ml_result else None,
        )

    def save(self, evaluation, ml_result=None):
        if ml_result:
            evaluation.ml_anomaly_score = ml_result.get("ml_anomaly_score")
            evaluation.ml_is_anomaly = ml_result.get("ml_is_anomaly")
            evaluation.ml_model_status = ml_result.get("ml_model_status")
        if self.writer is None:
            logging.warning("OverallEvaluator has no BackendWriter — skip save")
            return None
        return self.writer.save_live_run_evaluation(evaluation)
