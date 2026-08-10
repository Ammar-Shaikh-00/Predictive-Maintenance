from app.services.executive_view_service import build_executive_payload


def test_executive_payload_keeps_roi_and_util_unavailable():
    payload = build_executive_payload(
        plant_status="PRODUCTION",
        produced_today=1200,
        scrap_today=3.5,
        energy_kwh=440,
        energy_cost=88,
        energy_cost_source="LIVE",
        savings_kwh=50,
        savings_cost=10,
        savings_available=True,
        open_alarms=2,
        open_tickets=4,
        critical_tickets=1,
        connected_machines=1,
        total_machines=3,
        digitalization_progress=42,
        prediction_readiness=55,
        data_quality_score=70,
        top_problems=[{"id": "1", "text": "Pressure", "value_source": "LIVE"}],
    )
    by_key = {k["key"]: k for k in payload["kpis"]}
    assert by_key["produced_today"]["available"] is True
    assert by_key["produced_today"]["value"] == 1200
    assert by_key["utilization"]["available"] is False
    assert by_key["utilization"]["display"] == "—"
    assert by_key["availability"]["available"] is False
    assert by_key["downtime"]["available"] is False
    assert payload["ai_roi"]["available"] is False
    assert payload["ai_benefit"]["available"] is True
    assert payload["ai_benefit"]["label"] == "Prediction readiness"
    assert payload["ai_benefit"]["value"] == 55.0
    assert len(payload["top_savings"]) == 1


def test_executive_payload_empty_sources():
    payload = build_executive_payload(
        plant_status="STOPPED",
        produced_today=None,
        scrap_today=None,
        energy_kwh=None,
        energy_cost=None,
        energy_cost_source=None,
        savings_kwh=None,
        savings_cost=None,
        savings_available=False,
        open_alarms=0,
        open_tickets=0,
        critical_tickets=0,
        connected_machines=0,
        total_machines=1,
        digitalization_progress=10,
        prediction_readiness=10,
        data_quality_score=10,
        top_problems=[],
    )
    assert all(k["display"] == "—" or k["key"] in {"produced_today", "scrap", "energy", "utilization", "availability", "downtime"} for k in payload["kpis"])
    assert payload["top_savings"] == []
    assert payload["ai_benefit"]["value"] == 10.0
