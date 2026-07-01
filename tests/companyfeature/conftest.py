from __future__ import annotations

import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.db.session import Base, get_db  # noqa: E402
from backend.app.main import create_app  # noqa: E402

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
TestSessionLocal = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture()
async def user_client():
    """Mock-auth client with user (non-admin) role — company reads only require login."""
    prev_mode = os.environ.get("AUTH_MODE")
    prev_role = os.environ.get("MOCK_USER_ROLE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    os.environ.pop("AUTH_MODE", None) if prev_mode is None else os.environ.__setitem__("AUTH_MODE", prev_mode)
    os.environ.pop("MOCK_USER_ROLE", None) if prev_role is None else os.environ.__setitem__("MOCK_USER_ROLE", prev_role)


@pytest_asyncio.fixture()
async def anon_client():
    """JWT-mode client with no token — protected company endpoints return 401."""
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

    os.environ.pop("AUTH_MODE", None) if prev_mode is None else os.environ.__setitem__("AUTH_MODE", prev_mode)
