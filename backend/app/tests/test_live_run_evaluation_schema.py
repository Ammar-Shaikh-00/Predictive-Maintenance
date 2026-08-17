"""Schema tests for live_run_evaluation ML fields."""

import pytest
from pydantic import ValidationError

from app.schemas.live_run_evaluation import LiveRunEvaluationCreate, LiveRunEvaluationRead


def test_create_accepts_ml_fields():
    payload = LiveRunEvaluationCreate(
        evaluation_status="COMPLETED",
        detected_state="PRODUCTION",
        ml_anomaly_score=0.82,
        ml_is_anomaly=True,
        ml_model_status="ready",
    )
    data = payload.model_dump()
    assert data["ml_anomaly_score"] == 0.82
    assert data["ml_is_anomaly"] is True
    assert data["ml_model_status"] == "READY"
    assert "anomaly_score" not in data


def test_create_maps_legacy_anomaly_score():
    payload = LiveRunEvaluationCreate.model_validate(
        {
            "evaluation_status": "COMPLETED",
            "detected_state": "PRODUCTION",
            "anomaly_score": 0.55,
        }
    )
    assert payload.ml_anomaly_score == 0.55


def test_ml_anomaly_score_rejects_out_of_range():
    with pytest.raises(ValidationError):
        LiveRunEvaluationCreate(
            evaluation_status="COMPLETED",
            detected_state="PRODUCTION",
            ml_anomaly_score=1.5,
        )


def test_read_schema_exposes_ml_fields():
    fields = LiveRunEvaluationRead.model_fields
    assert "ml_anomaly_score" in fields
    assert "ml_is_anomaly" in fields
    assert "ml_model_status" in fields
    assert "anomaly_score" not in fields
