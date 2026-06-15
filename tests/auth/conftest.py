from __future__ import annotations

import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.db.session import Base, get_db  # noqa: E402
from backend.app.main import create_app  # noqa: E402

_TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
_engine = create_async_engine(_TEST_DB_URL)
_TestSession = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db():
    async with _TestSession() as session:
        yield session


@pytest_asyncio.fixture()
async def client():
    """Admin mock client — AUTH_MODE=mock, role=admin."""
    from backend.app.services.dependency.ratelimit import _hits

    _hits.clear()

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_EMAIL"] = "mock@local"
    os.environ["MOCK_USER_ROLE"] = "admin"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


@pytest_asyncio.fixture()
async def jwt_auth_client():
    """Real JWT client for /api/auth/me and role-enforcement tests — AUTH_MODE=jwt."""
    from backend.app.services.dependency.ratelimit import _hits

    _hits.clear()

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "jwt"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


@pytest_asyncio.fixture()
async def user_client():
    """User-role mock client — AUTH_MODE=mock, role=user."""
    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_EMAIL"] = "mock@local"
    os.environ["MOCK_USER_ROLE"] = "user"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode
