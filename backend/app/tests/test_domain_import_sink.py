"""Unit tests for domain import sink helpers (no DB)."""

from app.services.domain_import_sink_service import _as_float, _as_str, _parse_run_id


def test_as_float_parses_numbers():
    assert _as_float("12.5") == 12.5
    assert _as_float(3) == 3.0
    assert _as_float("") is None
    assert _as_float(None) is None
    assert _as_float("x") is None


def test_as_str_trims_and_limits():
    assert _as_str("  abc  ") == "abc"
    assert _as_str("abcdef", max_len=3) == "abc"
    assert _as_str("") is None


def test_parse_run_id():
    assert _parse_run_id("42") == 42
    assert _parse_run_id(7) == 7
    assert _parse_run_id("run-1") is None
    assert _parse_run_id(None) is None
