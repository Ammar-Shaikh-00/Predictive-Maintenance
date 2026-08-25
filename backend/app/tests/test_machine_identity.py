from uuid import UUID

from app.services.machine_identity import ids_match, parse_machine_uuid, _name_candidates


def test_parse_machine_uuid_accepts_uuid_string():
    value = parse_machine_uuid("6f37c433-44e9-4a66-b019-cc342a95cc54")
    assert value == UUID("6f37c433-44e9-4a66-b019-cc342a95cc54")


def test_parse_machine_uuid_rejects_slug():
    assert parse_machine_uuid("extruder_01") is None
    assert parse_machine_uuid("") is None
    assert parse_machine_uuid(None) is None


def test_ids_match_uuid_and_dashed_forms():
    uid = "6f37c433-44e9-4a66-b019-cc342a95cc54"
    assert ids_match(uid, uid.upper())
    assert ids_match(uid, UUID(uid))
    assert not ids_match(uid, "extruder_01")


def test_name_candidates_are_generic_not_hardcoded():
    names = _name_candidates("line2_press")
    assert "line2_press" in names
    assert "line2 press" in names
    assert "extruder_01" not in names
