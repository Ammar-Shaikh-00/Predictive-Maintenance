from app.services.operations_center_service import (
    _is_producing,
    _map_plant_status,
)


def test_map_plant_status_low_production_not_stopped():
    assert _map_plant_status("LOW_PRODUCTION") == "LOW_PRODUCTION"
    assert _map_plant_status("low_production") == "LOW_PRODUCTION"


def test_map_plant_status_production():
    assert _map_plant_status("PRODUCTION") == "PRODUCTION"


def test_map_plant_status_unknown_defaults_stopped():
    assert _map_plant_status("UNKNOWN") == "STOPPED"
    assert _map_plant_status(None) == "STOPPED"


def test_is_producing_includes_low_production():
    assert _is_producing("PRODUCTION") is True
    assert _is_producing("LOW_PRODUCTION") is True
    assert _is_producing("OFF") is False
