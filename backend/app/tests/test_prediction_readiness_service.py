from app.services.prediction_readiness_service import unavailable_snapshot


def test_unavailable_snapshot_has_no_invented_value():
    snap = unavailable_snapshot("extruder_01")
    assert snap["available"] is False
    assert snap["value"] is None
    assert snap["machine_id"] == "extruder_01"
    assert "AI/ML" in (snap["hint"] or "")
