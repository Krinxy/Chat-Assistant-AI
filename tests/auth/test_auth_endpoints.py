from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_returns_201(client: AsyncClient) -> None:
    resp = await client.post("/api/auth/register", json={"email": "a@test.com", "password": "password1", "role": "user"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "a@test.com"
    assert "id" in body


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client: AsyncClient) -> None:
    payload = {"email": "dup@test.com", "password": "password1", "role": "user"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_valid_credentials_returns_token(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json={"email": "b@test.com", "password": "secretpass", "role": "user"})
    resp = await client.post("/api/auth/login", json={"email": "b@test.com", "password": "secretpass"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json={"email": "c@test.com", "password": "rightpass", "role": "user"})
    resp = await client.post("/api/auth/login", json={"email": "c@test.com", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_accessible_in_mock_mode(client: AsyncClient) -> None:
    # In mock mode no token required — AUTH_MODE=mock bypasses JWT
    resp = await client.get("/api/documents")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_delete_allowed_in_mock_admin_mode(client: AsyncClient) -> None:
    # Admin reaches the handler; non-existent doc returns 404 (not auth-blocked 403)
    resp = await client.delete("/api/documents/123")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_only_upload_blocked_for_user_role(user_client: AsyncClient) -> None:
    resp = await user_client.post("/api/documents/upload", files={"file": ("test.txt", b"content", "text/plain")})
    assert resp.status_code == 403


# ── /api/auth/me — token validation endpoint ─────────────────────────────────


@pytest.mark.asyncio
async def test_me_no_token_returns_401(jwt_auth_client: AsyncClient) -> None:
    resp = await jwt_auth_client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_fake_token_returns_401(jwt_auth_client: AsyncClient) -> None:
    resp = await jwt_auth_client.get("/api/auth/me", headers={"Authorization": "Bearer this.is.fake"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_valid_token_returns_email_and_role(jwt_auth_client: AsyncClient) -> None:
    await jwt_auth_client.post("/api/auth/register", json={"email": "me@test.com", "password": "password1"})
    login = await jwt_auth_client.post("/api/auth/login", json={"email": "me@test.com", "password": "password1"})
    token = login.json()["access_token"]
    resp = await jwt_auth_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "me@test.com"
    assert body["role"] == "user"


@pytest.mark.asyncio
async def test_register_cannot_set_admin_role(jwt_auth_client: AsyncClient) -> None:
    resp = await jwt_auth_client.post("/api/auth/register", json={"email": "badactor@test.com", "password": "password1", "role": "admin"})
    assert resp.status_code == 201
    # role param is ignored — always registers as "user"
    login = await jwt_auth_client.post("/api/auth/login", json={"email": "badactor@test.com", "password": "password1"})
    token = login.json()["access_token"]
    me = await jwt_auth_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["role"] == "user"
