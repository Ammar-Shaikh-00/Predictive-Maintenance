from types import SimpleNamespace

import pytest


def test_root_endpoint_returns_service_metadata(client):
    response = client.get("/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "Predictive Maintenance Platform"
    assert payload["status"] == "running"
    assert "timestamp" in payload


def test_health_endpoint_reports_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "Predictive Maintenance Backend"


def test_unknown_route_uses_custom_404_payload(client):
    response = client.get("/this-route-does-not-exist")

    assert response.status_code == 404
    payload = response.json()
    assert payload["detail"].startswith("Endpoint not found:")
    assert payload["tip"] == "Visit /docs for the complete API documentation"




def test_login_invalid_credentials_returns_401(client):
    from unittest.mock import AsyncMock, patch
    with patch("app.services.user_service.authenticate", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = None  # simulate invalid user

        response = client.post(
            "/users/login",
            data={"username": "nobody@example.com", "password": "wrong"},
        )

        assert response.status_code == 401


def test_login_valid_credentials_returns_tokens(client, monkeypatch: pytest.MonkeyPatch):
    from app.api.routers import users

    async def fake_authenticate(session, username, password):
        if username == "admin@example.com" and password == "admin123":
            return SimpleNamespace(email=username)
        return None

    monkeypatch.setattr(users.user_service, "authenticate", fake_authenticate)
    monkeypatch.setattr(users, "create_access_token", lambda subject: "test-access-token")
    monkeypatch.setattr(users, "create_refresh_token", lambda subject: "test-refresh-token")

    response = client.post(
        "/users/login",
        data={"username": "admin@example.com", "password": "admin123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "test-access-token"
    assert payload["refresh_token"] == "test-refresh-token"
    assert payload["token_type"] == "bearer"
