"""
Pentest-driven security hardening tests.
Each test reproduces a discovered vulnerability and asserts it is now blocked.
"""

from __future__ import annotations

import os

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# ── env setup ───────────────────────────────────────────────────────────────
os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars!")
os.environ.setdefault("AUTH_MODE", "jwt")


@pytest_asyncio.fixture
async def client():
    os.environ["AUTH_MODE"] = "jwt"
    os.environ["JWT_SECRET"] = "test-secret-key-minimum-32-chars!"

    # Clear rate-limit state so tests don't bleed into each other
    from backend.app.services.dependency.ratelimit import IpRateLimiter

    IpRateLimiter._hits.clear()

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    from backend.app.db.session import Base, get_db
    from backend.app.main import create_app

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    await engine.dispose()


# ── helpers ─────────────────────────────────────────────────────────────────


async def _register(client: AsyncClient, email: str = "user@test.com", password: str = "password123", role: str = "user"):
    return await client.post("/api/auth/register", json={"email": email, "password": password, "role": role})


async def _login(client: AsyncClient, email: str = "user@test.com", password: str = "password123"):
    return await client.post("/api/auth/login", json={"email": email, "password": password})


# ── 1. Rate limiting ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_rate_limit_blocks_after_5_attempts(client: AsyncClient):
    """Brute force: 6th attempt within the window must be 429."""
    await _register(client)
    for _ in range(5):
        await client.post("/api/auth/login", json={"email": "user@test.com", "password": "wrong"})

    r = await client.post("/api/auth/login", json={"email": "user@test.com", "password": "wrong"})
    assert r.status_code == 429
    assert "Too many requests" in r.json()["detail"]
    assert "Retry-After" in r.headers


@pytest.mark.asyncio
async def test_forgot_password_rate_limit(client: AsyncClient):
    """Password reset endpoint is limited to 3 per 10 minutes."""
    for _ in range(3):
        await client.post("/api/auth/forgot-password", json={"email": "x@x.com"})

    r = await client.post("/api/auth/forgot-password", json={"email": "x@x.com"})
    assert r.status_code == 429


# ── 2. Body size limit ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_oversized_body_rejected(client: AsyncClient):
    """1.1 MB body must return 413, not 500 (limit is 1 MB)."""
    big_password = "A" * 1_100_000  # ~1.1 MB
    body = f'{{"email":"x@x.com","password":"{big_password}"}}'.encode()
    r = await client.post(
        "/api/auth/login",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 413


# ── 3. Password validation ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_weak_password_rejected_on_register(client: AsyncClient):
    r = await _register(client, password="short")
    assert r.status_code == 422
    assert "8 characters" in r.json()["detail"]


@pytest.mark.asyncio
async def test_strong_password_accepted(client: AsyncClient):
    r = await _register(client, password="strongpass1")
    assert r.status_code == 201


# ── 4. Password reset flow ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_forgot_password_returns_token_for_existing_user(client: AsyncClient):
    await _register(client)
    r = await client.post("/api/auth/forgot-password", json={"email": "user@test.com"})
    assert r.status_code == 200
    data = r.json()
    assert "reset_token" in data
    assert len(data["reset_token"]) > 20


@pytest.mark.asyncio
async def test_forgot_password_returns_token_for_unknown_email(client: AsyncClient):
    """Anti-enumeration: unknown emails also get a (dummy) token response."""
    r = await client.post("/api/auth/forgot-password", json={"email": "ghost@nowhere.com"})
    assert r.status_code == 200
    assert "reset_token" in r.json()


@pytest.mark.asyncio
async def test_reset_password_full_flow(client: AsyncClient):
    await _register(client)
    forgot = await client.post("/api/auth/forgot-password", json={"email": "user@test.com"})
    token = forgot.json()["reset_token"]

    reset = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": token,
            "new_password": "newpassword99",
        },
    )
    assert reset.status_code == 200

    # Old password must no longer work
    r_old = await _login(client, password="password123")
    assert r_old.status_code == 401

    # New password works
    r_new = await _login(client, password="newpassword99")
    assert r_new.status_code == 200
    assert "access_token" in r_new.json()


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    r = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": "this.is.garbage",
            "new_password": "newpassword99",
        },
    )
    assert r.status_code == 400
    assert "Invalid or expired" in r.json()["detail"]


@pytest.mark.asyncio
async def test_reset_password_rejects_access_token(client: AsyncClient):
    """An access token must not be usable as a reset token (purpose claim check)."""
    await _register(client)
    login_resp = await _login(client)
    access_token = login_resp.json()["access_token"]

    r = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": access_token,
            "new_password": "newpassword99",
        },
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_weak_new_password_rejected(client: AsyncClient):
    await _register(client)
    forgot = await client.post("/api/auth/forgot-password", json={"email": "user@test.com"})
    token = forgot.json()["reset_token"]

    r = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": token,
            "new_password": "123",
        },
    )
    assert r.status_code == 422


# ── 5. CORS ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cors_hostile_origin_not_reflected(client: AsyncClient):
    """evil.com must not appear in Access-Control-Allow-Origin."""
    r = await client.options(
        "/api/auth/login",
        headers={"Origin": "https://evil.com", "Access-Control-Request-Method": "POST"},
    )
    acao = r.headers.get("access-control-allow-origin", "")
    assert "evil.com" not in acao
