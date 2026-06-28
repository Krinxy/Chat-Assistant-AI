from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.api.documents import _get_document_embedder  # noqa: E402
from backend.app.db.session import Base, get_db  # noqa: E402
from backend.app.main import create_app  # noqa: E402
from backend.app.services.core.ingestion.embedder import DocumentEmbedder, EmbeddingService  # noqa: E402
from tests.ragfeature.conftest import FakeChromaCollection, HashingEmbeddingModel  # noqa: E402

_SECRET = os.environ["JWT_SECRET"]
_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db():
    async with _Session() as session:
        yield session


@pytest_asyncio.fixture()
async def jwt_client():
    """Real JWT client — AUTH_MODE=jwt, validates tokens against DB."""
    from backend.app.services.dependency.ratelimit import IpRateLimiter

    IpRateLimiter._buckets.clear()

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "jwt"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    fake_embedder = DocumentEmbedder(FakeChromaCollection(), EmbeddingService(model=HashingEmbeddingModel()))
    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = lambda: fake_embedder
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


def _expired_token(email: str) -> str:
    payload = {"sub": email, "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}
    return jwt.encode(payload, _SECRET, algorithm="HS256")


@pytest.mark.asyncio
async def test_no_token_returns_401(jwt_client: AsyncClient) -> None:
    resp = await jwt_client.get("/api/documents")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_returns_401(jwt_client: AsyncClient) -> None:
    resp = await jwt_client.get("/api/documents", headers={"Authorization": "Bearer not.a.real.token"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_returns_401_with_message(jwt_client: AsyncClient) -> None:
    await jwt_client.post("/api/auth/register", json={"email": "exp@test.com", "password": "password1", "role": "user"})
    resp = await jwt_client.get("/api/documents", headers={"Authorization": f"Bearer {_expired_token('exp@test.com')}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_valid_token_grants_access(jwt_client: AsyncClient) -> None:
    await jwt_client.post("/api/auth/register", json={"email": "ok@test.com", "password": "password1", "role": "user"})
    login = await jwt_client.post("/api/auth/login", json={"email": "ok@test.com", "password": "password1"})
    token = login.json()["access_token"]
    resp = await jwt_client.get("/api/documents", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_user_role_blocked_on_admin_route(jwt_client: AsyncClient) -> None:
    await jwt_client.post("/api/auth/register", json={"email": "usr@test.com", "password": "password1", "role": "user"})
    login = await jwt_client.post("/api/auth/login", json={"email": "usr@test.com", "password": "password1"})
    token = login.json()["access_token"]
    resp = await jwt_client.delete("/api/documents/1", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
