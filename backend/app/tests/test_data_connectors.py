"""Unit tests for setup-wizard data connectors (no DB required)."""

from app.services.data_connectors.common import (
    apply_field_mapping,
    assert_safe_select,
    compute_quality_ratios,
)
from app.services.data_connectors.csv_connector import parse_csv_text


def test_assert_safe_select_allows_select():
    q = assert_safe_select("SELECT TOP 10 * FROM Tab_Actual")
    assert "Tab_Actual" in q


def test_assert_safe_select_rejects_delete():
    try:
        assert_safe_select("DELETE FROM Tab_Actual")
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "SELECT" in str(exc) or "Forbidden" in str(exc) or "Only" in str(exc)


def test_parse_csv_and_map_fields():
    text = "measured_at,machine_id,qc_score\n2026-07-01T10:00:00Z,extruder_01,0.95\n2026-07-01T11:00:00Z,extruder_01,0.91\n"
    raw = parse_csv_text(text)
    assert len(raw) == 2
    columns, mapped = apply_field_mapping(
        raw,
        {
            "timestamp": "measured_at",
            "machine_id": "machine_id",
            "quality_value": "qc_score",
        },
    )
    assert columns == ["timestamp", "machine_id", "quality_value"]
    assert mapped[0]["quality_value"] == "0.95"
    assert mapped[0]["timestamp"].startswith("2026-07-01")


def test_compute_quality_ratios_on_real_rows():
    rows = [
        {"timestamp": "2026-07-27T10:00:00Z", "machine_id": "e1", "value": "1"},
        {"timestamp": "2026-07-27T11:00:00Z", "machine_id": "e1", "value": ""},
        {"timestamp": "2026-07-27T12:00:00Z", "machine_id": "e1", "value": "1"},
    ]
    ratios = compute_quality_ratios(rows, required_fields=["timestamp", "machine_id", "value"])
    assert 0 < ratios["missing_values_ratio"] < 1
    assert ratios["availability_ratio"] > 0.5
