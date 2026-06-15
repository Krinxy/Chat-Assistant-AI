from __future__ import annotations

import os

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.db.session import Base  # noqa: E402
from backend.app.services.core.auth.user_service import (  # noqa: E402
    authenticate_user,
    create_access_token,
    register_user,
)

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def _setup_db():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_register_hashes_password() -> None:
    async with _Session() as db:
        user = await register_user("e@test.com", "plaintext", "user", db)
    assert user.hashed_password != "plaintext"
    assert user.hashed_password.startswith("$pbkdf2-sha256$")


@pytest.mark.asyncio
async def test_register_duplicate_raises_409() -> None:
    from fastapi import HTTPException

    async with _Session() as db:
        await register_user("f@test.com", "password1", "user", db)
    async with _Session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await register_user("f@test.com", "password1", "user", db)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_authenticate_correct_password_returns_user() -> None:
    async with _Session() as db:
        await register_user("g@test.com", "correctpass", "user", db)
    async with _Session() as db:
        user = await authenticate_user("g@test.com", "correctpass", db)
    assert user.email == "g@test.com"


@pytest.mark.asyncio
async def test_authenticate_wrong_password_raises_401() -> None:
    from fastapi import HTTPException

    async with _Session() as db:
        await register_user("h@test.com", "rightpass", "user", db)
    async with _Session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user("h@test.com", "wrong", db)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_create_access_token_contains_email_sub() -> None:
    from jose import jwt

    token = create_access_token("sub@test.com")
    payload = jwt.decode(
        token,
        os.environ["JWT_SECRET"],
        algorithms=["HS256"],
        audience="aura-api",
        issuer="aura-auth",
    )
    assert payload["sub"] == "sub@test.com"
    assert payload["iss"] == "aura-auth"
    assert payload["aud"] == "aura-api"
    assert "jti" in payload
    assert "nbf" in payload
    assert "iat" in payload
