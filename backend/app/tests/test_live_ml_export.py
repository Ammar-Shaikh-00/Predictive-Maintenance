"""Unit tests for live ML export helpers + ingest contract stability notes."""

from datetime import datetime, timezone
from uuid import uuid4

from app.services.live_export_service import parse_uuid, to_utc_naive


def test_to_utc_naive_strips_timezone():
    aware = datetime(2026, 8, 12, 10, 0, tzinfo=timezone.utc)
    naive = to_utc_naive(aware)
    assert naive is not None
    assert naive.tzinfo is None
    assert naive.hour == 10


def test_to_utc_naive_passthrough_naive():
    naive = datetime(2026, 8, 12, 10, 0)
    assert to_utc_naive(naive) == naive


def test_parse_uuid_accepts_string_and_uuid():
    u = uuid4()
    assert parse_uuid(str(u)) == u
    assert parse_uuid(u) == u
    assert parse_uuid(None) is None


def test_ingest_router_prefixes_stable():
    """Ammar contract — prefixes must not change without coordination."""
    from app.api.routers import (
        live_feature_evaluation,
        live_ml_export,
        live_process_window,
        live_run_evaluation,
        machine_sensor_raw,
    )

    assert live_process_window.router.prefix == "/live-process-windows"
    assert live_run_evaluation.router.prefix == "/live-run-evaluations"
    assert live_feature_evaluation.router.prefix == "/live-feature-evaluations"
    assert machine_sensor_raw.router.prefix == "/machine-raw-data"
    assert live_ml_export.router.prefix == "/live-ml-export"

    export_paths = {getattr(r, "path", None) for r in live_ml_export.router.routes}
    assert "/live-ml-export/pipeline-status" in export_paths
    assert "/live-ml-export/windows" in export_paths
    assert "/live-ml-export/run-evaluations" in export_paths
    assert "/live-ml-export/feature-evaluations" in export_paths
