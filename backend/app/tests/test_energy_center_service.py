from app.services.energy_center_service import aggregate_energy, extract_material_key


def test_extract_material_key():
    assert extract_material_key({"material_batch": "MB-1"}) == "MB-1"
    assert extract_material_key({}, {"material_id": "MAT-9"}) == "MAT-9"
    assert extract_material_key({}) is None


def test_aggregate_energy_honest_nulls():
    out = aggregate_energy(
        [{"machine_id": "m1", "kwh": 10, "cost": None, "payload": {}}],
        settings={},
    )
    assert out["kpis"]["kwh"] == 10
    assert out["kpis"]["cost"] is None
    assert out["kpis"]["co2_kg"] is None
    assert out["savings_potential"]["available"] is False


def test_aggregate_energy_derived_co2_cost_and_savings():
    out = aggregate_energy(
        [
            {"machine_id": "m1", "kwh": 80, "cost": 10, "payload": {"material_batch": "A"}},
            {"machine_id": "m2", "kwh": 20, "cost": None, "payload": {}},
        ],
        settings={
            "co2_kg_per_kwh": 0.4,
            "euro_per_kwh": 0.2,
            "baseline_period_kwh": 150,
            "currency": "EUR",
        },
        machine_names={"m1": "Extruder"},
    )
    assert out["kpis"]["kwh"] == 100
    assert out["kpis"]["co2_kg"] == 40.0
    assert out["kpis"]["co2_source"] == "DERIVED"
    assert out["kpis"]["cost"] == 14.0  # 10 live + 4 derived
    assert out["kpis"]["cost_source"] == "MIXED"
    assert out["savings_potential"]["available"] is True
    assert out["savings_potential"]["savings_kwh"] == 50.0
    assert out["by_machine"][0]["label"] == "Extruder"
    assert any(b["key"] == "A" for b in out["by_material"])
