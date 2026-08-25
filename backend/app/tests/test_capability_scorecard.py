from app.services.capability_catalog import (
    digitalization_weight_sum,
    load_capability_catalog,
)
from app.services.capability_scorecard_service import (
    compute_scores,
    evaluate_component,
    machine_data_work_pct,
)


def test_catalog_json_is_single_source_and_weights_sum_100():
    catalog = load_capability_catalog(force=True)
    assert catalog.get("components")
    assert digitalization_weight_sum(catalog) == 100
    formulas = " ".join(str(c.get("work_pct_formula")) for c in catalog["components"])
    assert "accuracy" not in formulas.lower()


def test_machine_data_work_pct_decay():
    assert machine_data_work_pct(None) == 0
    assert machine_data_work_pct(10) == 100
    assert machine_data_work_pct(60) == 100
    assert machine_data_work_pct(120) == 90
    assert machine_data_work_pct(661) == 0


def _spec(key, **kwargs):
    base = {
        "component_key": key,
        "label_de": key,
        "label_en": key,
        "category": "data",
        "sort_order": 1,
        "show_on_scorecard": True,
        "contributes_to_digitalization": True,
        "weight": 10,
        "value_source": "LIVE",
        "hint_active_de": "ok",
        "hint_locked_de": "locked",
        "unlocks_feature_keys": [],
    }
    base.update(kwargs)
    return base


def test_quality_locked_does_not_credit_digitalization():
    quality = evaluate_component(
        _spec("quality_data", weight=15, unlocks_feature_keys=["scrap_prediction"]),
        {
            "qc_event_count": 0,
            "qc_days_last_30": 0,
            "unlock_index": {
                "scrap_prediction": {
                    "feature_key": "scrap_prediction",
                    "label_de": "Ausschussvorhersage",
                }
            },
        },
    )
    live = evaluate_component(
        _spec("machine_data", weight=15),
        {"tsdb_age_seconds": 8},
    )
    scores = compute_scores([live, quality])
    assert quality["status"] == "locked"
    assert quality["work_pct"] == 0
    assert quality["unlocks"][0]["label_de"] == "Ausschussvorhersage"
    assert scores["digitalization_progress"] == 15


def test_models_validated_stays_locked_without_row():
    row = evaluate_component(_spec("models_validated", category="ml"), {"models_validated": False})
    assert row["status"] == "locked"
    assert row["work_pct"] == 0
    assert row["value_source"] == "MANUAL"


def test_machine_state_active_when_detected_state_fresh():
    row = evaluate_component(
        _spec("machine_state", category="ml"),
        {
            "detected_state": "COOLING",
            "eval_age_seconds": 30,
            "expected_ml_states": ["COOLING", "PRODUCTION"],
        },
    )
    assert row["status"] == "active"
    assert row["work_pct"] == 100
    assert row["detail"]["detected_state"] == "COOLING"


def test_machine_state_degraded_not_locked_when_stale():
    row = evaluate_component(
        _spec("machine_state", category="ml"),
        {
            "detected_state": "COOLING",
            "eval_age_seconds": 300,
            "expected_ml_states": ["COOLING"],
        },
    )
    assert row["status"] == "degraded"
    assert row["work_pct"] == 40


def test_production_history_caps_at_catalog_60():
    complete = evaluate_component(
        _spec(
            "production_history",
            expected_work_pct_now=60,
            settings={"work_pct_if_present": 60},
        ),
        {"run_count": 3, "latest_run_complete": True},
    )
    incomplete = evaluate_component(
        _spec("production_history", expected_work_pct_now=60),
        {"run_count": 1, "latest_run_complete": False},
    )
    empty = evaluate_component(
        _spec("production_history", expected_work_pct_now=60),
        {"run_count": 0},
    )
    assert complete["status"] == "active"
    assert complete["work_pct"] == 60
    assert incomplete["status"] == "degraded"
    assert incomplete["work_pct"] == 60
    assert empty["status"] == "locked"
    assert empty["work_pct"] == 0


def test_anomaly_models_degraded_when_partial():
    row = evaluate_component(
        _spec("anomaly_models", category="ml", contributes_to_digitalization=False, weight=0),
        {"ml_models_loaded": 4, "ml_models_expected": 6},
    )
    assert row["status"] == "degraded"
    assert row["work_pct"] == 67
    assert row["contributes_to_digitalization"] is False
