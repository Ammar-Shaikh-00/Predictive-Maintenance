from app.services.ai_service_health import (
    apply_ai_server_to_sources,
    interpret_ai_health_response,
)


def test_interpret_health_ok_body():
    assert interpret_ai_health_response(200, {"status": "ok"}) is True
    assert interpret_ai_health_response(200, {"status": "healthy"}) is True
    assert interpret_ai_health_response(200, {}) is True


def test_interpret_health_rejects_failure():
    assert interpret_ai_health_response(200, {"status": "unavailable"}) is False
    assert interpret_ai_health_response(503, {"status": "ok"}) is False
    assert interpret_ai_health_response(None, {"status": "ok"}) is False


def test_apply_ai_server_adds_or_removes_weight():
    def progress(keys):
        return 10 if "ai_server" in keys else 0

    connected, missing, pct = apply_ai_server_to_sources(
        ["machine_data", "ai_server"],
        ["quality_data"],
        healthy=False,
        progress_fn=progress,
    )
    assert "ai_server" not in connected
    assert "ai_server" in missing
    assert pct == 0

    connected, missing, pct = apply_ai_server_to_sources(
        ["machine_data"],
        ["quality_data", "ai_server"],
        healthy=True,
        progress_fn=progress,
    )
    assert connected == ["ai_server", "machine_data"]
    assert "ai_server" not in missing
    assert pct == 10
