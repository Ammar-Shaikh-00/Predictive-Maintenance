from app.services.live_monitor_health import (
    candidate_live_monitor_urls,
    parse_live_monitor_health,
)


def test_candidates_include_localhost_and_edge():
    urls = candidate_live_monitor_urls("http://127.0.0.1:8001")
    assert "http://127.0.0.1:8001" in urls
    assert "http://127.0.0.1:9003" in urls
    assert "http://localhost:8001" in urls
    assert "http://100.119.197.81:9003" in urls


def test_parse_pipeline_22_health_counts_six_models():
    body = {
        "status": "ok",
        "pipeline_version": "2.2",
        "ml_models_loaded": [
            "COOLING",
            "HEATING",
            "LOW_PRODUCTION",
            "OFF",
            "PRODUCTION",
            "READY",
        ],
        "layer1_status": "active",
    }
    snap = parse_live_monitor_health(
        url="http://100.119.197.81:9003/health", http_status=200, body=body
    )
    assert snap.reachable is True
    assert len(snap.ml_models_loaded) == 6
    assert snap.models_expected == 6
    assert snap.classifier_loaded is None


def test_parse_health_counts_six_models():
    body = {
        "status": "ok",
        "ml_models_loaded": [
            "COOLING",
            "HEATING",
            "LOW_PRODUCTION",
            "OFF",
            "PRODUCTION",
            "READY",
        ],
        "models_expected_count": 6,
        "state_classifier_loaded": True,
        "layer1_status": "active",
    }
    snap = parse_live_monitor_health(
        url="http://127.0.0.1:9003/health", http_status=200, body=body
    )
    assert snap.reachable is True
    assert len(snap.ml_models_loaded) == 6
    assert snap.models_expected == 6
    assert snap.classifier_loaded is True
