# Overall Evaluator — takes per-feature results and produces
#               one final evaluation result for the current live window.
#               Writes result to backend live_run_evaluation.

import logging
import math
from types import SimpleNamespace

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
        if not feature_results:
            # Still persist a run evaluation with ML fields (e.g. no baseline yet)
            ml_score = ml_result.get("ml_anomaly_score") if ml_result else None
            ml_flag = ml_result.get("ml_is_anomaly") if ml_result else None
            ml_status = ml_result.get("ml_model_status") if ml_result else None
            overall = "WARNING" if ml_flag is True else "NORMAL"
            explanation = (
                f"State={confirmed_state}. No baseline feature comparison. "
                f"ML anomaly={ml_flag} raw_score={ml_score} status={ml_status}."
            )
            return SimpleNamespace(
                id=None,
                live_process_window_id=live_window_id,
                detected_state=confirmed_state,
                active_regime=baseline_result.get("active_regime") if baseline_result else None,
                matched_profile_id=None,
                baseline_id=None,
                baseline_selection_method=(
                    baseline_result.get("baseline_selection_method") if baseline_result else None
                ),
                evaluation_status="EVALUATED",
                overall_status=overall,
                stability_status=None,
                drift_score=None,
                anomaly_score=None,
                explanation_text=explanation,
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

        speed_std = features.get("screw_speed_std", 0)
        pressure_std = features.get("pressure_std", 0)

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

        explanation_text = self._build_explanation(
            feature_results=feature_results,
            overall_status=overall_status,
            stability_status=stability_status,
            drift_score=drift_score,
            baseline_result=baseline_result,
        )

        if drift_result and drift_result["drift_detected"]:
            if overall_status == "NORMAL":
                overall_status = "WARNING"
            drift_features = drift_result["drifting_features"]
            explanation_text += f" Drift detected in: {', '.join(drift_features)}."

        return SimpleNamespace(
            id=None,
            live_process_window_id=live_window_id,
            detected_state=confirmed_state,
            active_regime=baseline_result.get("active_regime"),
            matched_profile_id=None,
            baseline_id=None,
            baseline_selection_method=baseline_result.get("baseline_selection_method"),
            evaluation_status="EVALUATED",
            overall_status=overall_status,
            stability_status=stability_status,
            drift_score=drift_score,
            anomaly_score=anomaly_score,
            explanation_text=explanation_text,
            ml_anomaly_score=ml_result.get("ml_anomaly_score") if ml_result else None,
            ml_is_anomaly=ml_result.get("ml_is_anomaly") if ml_result else None,
            ml_model_status=ml_result.get("ml_model_status") if ml_result else None,
        )

    def _build_explanation(
        self,
        feature_results,
        overall_status,
        stability_status,
        drift_score,
        baseline_result,
    ) -> str:
        lines = []
        regime = baseline_result.get("active_regime", "UNKNOWN")
        method = baseline_result.get("baseline_selection_method", "UNKNOWN")
        confidence = baseline_result.get("baseline_confidence", "UNKNOWN")
        lines.append(
            f"Active regime: {regime} | Baseline: {method} | Confidence: {confidence}."
        )

        flagged = [r for r in feature_results if r.feature_status in ("WARNING", "CRITICAL")]
        if not flagged:
            lines.append("All evaluated features are within normal range.")
        else:
            for r in flagged:
                direction = "above" if (r.deviation_abs or 0) > 0 else "below"
                deviation_pct = 0.0 if r.deviation_pct is None else abs(r.deviation_pct)
                z_score = 0.0 if r.z_score is None else r.z_score
                lines.append(
                    f"{r.feature_name} is {deviation_pct:.1f}% {direction} baseline "
                    f"(z={z_score:.2f}, status={r.feature_status})."
                )

        if stability_status == "UNSTABLE":
            lines.append("Process variability is high — machine may be unstable.")
        elif stability_status == "TRANSITION":
            lines.append("Process shows mild variability — possible transition.")

        if drift_score > 0.6:
            lines.append(
                f"Drift score is elevated ({drift_score:.2f}) — process may be drifting from baseline."
            )

        return " ".join(lines)

    def save(self, evaluation, ml_result=None):
        if ml_result:
            evaluation.ml_anomaly_score = ml_result.get("ml_anomaly_score")
            evaluation.ml_is_anomaly = ml_result.get("ml_is_anomaly")
            evaluation.ml_model_status = ml_result.get("ml_model_status")
        if self.writer is None:
            logging.warning("OverallEvaluator has no BackendWriter — skip save")
            return None
        return self.writer.save_live_run_evaluation(evaluation)
