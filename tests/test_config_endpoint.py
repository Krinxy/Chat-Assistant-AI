from __future__ import annotations

import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.api.documents import _get_document_embedder  # noqa: E402
from backend.app.db.session import Base, get_db  # noqa: E402
from backend.app.main import create_app  # noqa: E402
from backend.app.services.core.ingestion.embedder import DocumentEmbedder, EmbeddingService  # noqa: E402
from tests.ragfeature.conftest import FakeChromaCollection, HashingEmbeddingModel  # noqa: E402

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db():
    async with _Session() as session:
        yield session


def _fake_embedder() -> DocumentEmbedder:
    return DocumentEmbedder(FakeChromaCollection(), EmbeddingService(model=HashingEmbeddingModel()))


@pytest_asyncio.fixture()
async def anon_client():
    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "jwt"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = _fake_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


@pytest.mark.asyncio
async def test_config_endpoint_returns_200_without_auth(anon_client: AsyncClient) -> None:
    resp = await anon_client.get("/api/config")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_config_endpoint_contains_persist_flag(anon_client: AsyncClient) -> None:
    resp = await anon_client.get("/api/config")
    body = resp.json()
    assert "persist_token_in_browser" in body
    assert isinstance(body["persist_token_in_browser"], bool)


@pytest.mark.asyncio
async def test_config_persist_flag_reflects_backend_yaml(anon_client: AsyncClient) -> None:
    from backend.app.config import cfg as app_cfg

    resp = await anon_client.get("/api/config")
    assert resp.json()["persist_token_in_browser"] == app_cfg.api.persist_token_in_browser
