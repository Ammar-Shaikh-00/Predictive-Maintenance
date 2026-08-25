from app.services.ai_findings_service import (
    anomaly_run_to_prediction_card,
    clean_explanation_for_display,
    extract_provenance_tags,
    extract_recommended_action,
    feature_to_prediction_card,
    primary_provenance,
)


class _FakeRun:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", 1)
        self.explanation_text = kwargs.get("explanation_text")
        self.overall_status = kwargs.get("overall_status", "CRITICAL")
        self.stability_status = kwargs.get("stability_status", "UNSTABLE")
        self.drift_score = kwargs.get("drift_score", 0.7)
        self.detected_state = kwargs.get("detected_state", "PRODUCTION")
        self.active_regime = kwargs.get("active_regime", "MID")
        self.ml_anomaly_score = kwargs.get("ml_anomaly_score", 0.5)
        self.ml_is_anomaly = kwargs.get("ml_is_anomaly", True)
        self.ml_model_status = kwargs.get("ml_model_status", "EVALUATED")
        self.live_process_window_id = kwargs.get("live_process_window_id")
        self.machine_id = kwargs.get("machine_id")
        self.production_run_id = kwargs.get("production_run_id")


class _FakeFeature:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", 9)
        self.feature_name = kwargs.get("feature_name", "pressure_mean")
        self.feature_status = kwargs.get("feature_status", "CRITICAL")
        self.z_score = kwargs.get("z_score", -11.6)
        self.current_value = kwargs.get("current_value", 120.0)
        self.baseline_mean = kwargs.get("baseline_mean", 300.0)
        self.baseline_std = kwargs.get("baseline_std", 20.0)
        self.live_process_window_id = 1
        self.live_run_evaluation_id = 1


def test_extract_action_and_tags_from_ammar_explanation():
    text = (
        "Screw speed is below the normal baseline (z=-6.51). "
        "Recommended action: Check screw speed setpoints and recent material/process changes. "
        "[RULE_BASED] Extruder pressure is below the normal baseline (z=-11.63)."
    )
    assert "Check screw speed" in extract_recommended_action(text)
    assert "RULE_BASED" in extract_provenance_tags(text)
    cleaned = clean_explanation_for_display(text)
    assert "Recommended action" not in cleaned
    assert "Screw speed" in cleaned


def test_module15_feature_card_from_warning_critical():
    card = feature_to_prediction_card(_FakeFeature(feature_status="WARNING", z_score=-3.2))
    assert card["kind"] == "live_feature_evaluation"
    assert card["value_source"] == "RULE_BASED"
    assert "WARNING" in card["text"]


def test_module15_anomaly_card_when_ml_flagged():
    row = _FakeRun(ml_is_anomaly=True, explanation_text="Unusual pattern. [MODEL_PREDICTION]")
    card = anomaly_run_to_prediction_card(row)
    assert card["kind"] == "ml_anomaly"
    assert card["value_source"] == "MODEL_PREDICTION"


def test_provenance_prefers_model_tag():
    row = _FakeRun(
        ml_is_anomaly=False,
        explanation_text="All good [MODEL_PREDICTION]",
    )
    source, _ = primary_provenance(row)
    assert source == "MODEL_PREDICTION"
