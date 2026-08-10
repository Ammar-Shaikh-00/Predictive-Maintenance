from app.schemas.operations_hardening import DataQualityInput
from app.services.operations_hardening_service import (
    enrich_timeline_record,
    score_data_quality,
)


def test_score_data_quality_high_quality():
    score, metrics, issues = score_data_quality(
        DataQualityInput(
            source_key="machine_data",
            missing_values_ratio=0.01,
            stale_ratio=0.02,
            duplicate_ratio=0.01,
            invalid_ratio=0.01,
            availability_ratio=0.99,
        )
    )
    assert score > 90
    assert metrics["completeness"] > 0.95
    assert len(issues) == 0


def test_score_data_quality_flags_issues():
    score, _, issues = score_data_quality(
        DataQualityInput(
            source_key="quality_data",
            missing_values_ratio=0.35,
            stale_ratio=0.25,
            duplicate_ratio=0.12,
            invalid_ratio=0.18,
            availability_ratio=0.80,
        )
    )
    assert score < 80
    assert "missing_values_detected" in issues
    assert "stale_data_detected" in issues
    assert "invalid_or_unrealistic_values_detected" in issues


def test_enrich_timeline_record_adds_required_keys():
    out = enrich_timeline_record(
        {"company_id": "acme", "machine_id": "extruder_01", "payload": {"a": 1}}
    )
    assert out["company_id"] == "acme"
    assert out["machine_id"] == "extruder_01"
    assert "site_id" in out
    assert "production_run_id" in out
    assert "source_id" in out

