"""Robustness tests: non-essential services degrade gracefully instead of crashing."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.api import chat as chat_api  # noqa: E402
from backend.app.api.chat import initialize as initialize_chat  # noqa: E402
from backend.app.api.documents import _get_document_embedder  # noqa: E402
from backend.app.db.session import Base, get_db  # noqa: E402
from backend.app.main import create_app  # noqa: E402
from backend.app.services.core.agents.persona_loader import PersonaLoader  # noqa: E402
from backend.app.services.core.guardrails.policy_guard import PolicyGuard  # noqa: E402
from backend.app.services.core.ingestion.embedder import DocumentEmbedder, EmbeddingService  # noqa: E402
from backend.app.services.dependency.llm import LLMClient, LLMNotConfiguredError, LLMUnavailableError  # noqa: E402
from backend.app.services.utils.config import ConfigLoader  # noqa: E402
from tests.ragfeature.conftest import FakeChromaCollection, HashingEmbeddingModel  # noqa: E402

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db():
    async with _Session() as session:
        yield session


def _make_fake_embedder() -> DocumentEmbedder:
    return DocumentEmbedder(FakeChromaCollection(), EmbeddingService(model=HashingEmbeddingModel()))


@pytest_asyncio.fixture()
async def admin_client():
    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "admin"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = _make_fake_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


# ── ConfigLoader ──────────────────────────────────────────────────────────────


def test_config_loader_returns_empty_dict_on_missing_file(tmp_path: Path) -> None:
    ConfigLoader.reset()
    missing = tmp_path / "nonexistent.yaml"
    result = ConfigLoader._load(missing)
    assert result == {}
    ConfigLoader.reset()


def test_config_loader_returns_empty_dict_on_invalid_yaml(tmp_path: Path) -> None:
    bad_yaml = tmp_path / "bad.yaml"
    bad_yaml.write_text("key: [unclosed", encoding="utf-8")
    result = ConfigLoader._load(bad_yaml)
    assert result == {}


# ── PolicyGuard ───────────────────────────────────────────────────────────────


def test_policy_guard_returns_empty_patterns_on_missing_file(tmp_path: Path) -> None:
    guard = PolicyGuard.from_file(path=tmp_path / "missing.yaml")
    assert guard._patterns == []


def test_policy_guard_passes_all_when_empty_patterns() -> None:
    guard = PolicyGuard(patterns=[])
    outcome = guard.check_local("any message", "sess-1")
    from backend.app.services.core.guardrails import GuardStatus

    assert outcome.status == GuardStatus.PASSED


# ── PersonaLoader ─────────────────────────────────────────────────────────────


def test_persona_loader_returns_empty_string_on_missing_file() -> None:
    result = PersonaLoader.load("__nonexistent_persona__")
    assert result == ""


def test_persona_loader_blocks_path_traversal() -> None:
    with pytest.raises(ValueError, match="outside allowed directory"):
        PersonaLoader.load("../../../etc/passwd")


# ── EmbeddingService ──────────────────────────────────────────────────────────


def test_embedding_service_raises_runtime_error_on_model_load_failure() -> None:
    svc = EmbeddingService(model_name="nonexistent-model-xyz")
    with pytest.raises(RuntimeError, match="Failed to load embedding model"):
        svc._ensure_model()


# ── VectorDB get_collection ───────────────────────────────────────────────────


def test_vector_db_get_collection_raises_runtime_error_on_failure() -> None:
    from backend.app.services.dependency.vectordb import VectorDBClient, VectorDBConfig

    broken_client = MagicMock()
    broken_client.get_or_create_collection.side_effect = Exception("disk full")
    vdb = VectorDBClient(client=broken_client, config=VectorDBConfig())
    with pytest.raises(RuntimeError, match="ChromaDB collection"):
        vdb.get_collection()


# ── Document API: upsert failure → 503 ───────────────────────────────────────


class _FailingUpsertCollection(FakeChromaCollection):
    def upsert(self, **kwargs: Any) -> None:
        raise RuntimeError("ChromaDB write failed")


@pytest.mark.asyncio
async def test_upload_returns_503_when_embedder_upsert_fails(admin_client: AsyncClient) -> None:
    failing_embedder = DocumentEmbedder(_FailingUpsertCollection(), EmbeddingService(model=HashingEmbeddingModel()))
    app_state_override = _make_fake_embedder.__class__  # just a placeholder
    _ = app_state_override

    async with _engine.begin() as conn:
        pass  # tables already created by fixture

    from backend.app.main import create_app as _create_app

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "admin"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = _create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = lambda: failing_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/documents/upload", files={"file": ("test.txt", b"content", "text/plain")})
        assert resp.status_code == 503
        assert "unavailable" in resp.json()["detail"].lower()

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


# ── Document API: delete_by_source failure → still 204 ───────────────────────


class _FailingDeleteCollection(FakeChromaCollection):
    def delete(self, **kwargs: Any) -> None:
        raise RuntimeError("ChromaDB delete failed")


@pytest.mark.asyncio
async def test_delete_returns_204_even_when_chroma_delete_fails() -> None:
    from backend.app.main import create_app as _create_app

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "admin"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    good_embedder = _make_fake_embedder()
    app = _create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = lambda: good_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        upload = await ac.post("/api/documents/upload", files={"file": ("doc.txt", b"hello world", "text/plain")})
        assert upload.status_code == 201
        doc_id = upload.json()["id"]

        # Swap to failing collection for the delete
        failing_embedder = DocumentEmbedder(_FailingDeleteCollection(), EmbeddingService(model=HashingEmbeddingModel()))
        app.dependency_overrides[_get_document_embedder] = lambda: failing_embedder

        resp = await ac.delete(f"/api/documents/{doc_id}")
        assert resp.status_code == 204

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


# ── Chat endpoint: SQLAlchemy error → 503 ─────────────────────────────────────


@pytest.mark.asyncio
async def test_chat_returns_503_on_db_error() -> None:
    from backend.app.main import create_app as _create_app

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async def _broken_db():
        mock = AsyncMock()
        mock.get.side_effect = SQLAlchemyError("DB down")
        mock.add = MagicMock()
        mock.commit = AsyncMock(side_effect=SQLAlchemyError("DB down"))
        yield mock

    fake_embedder = _make_fake_embedder()
    app = _create_app()
    initialize_chat(app)
    app.dependency_overrides[get_db] = _broken_db
    app.dependency_overrides[_get_document_embedder] = lambda: fake_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/chat", json={"message": "hello"})
        assert resp.status_code == 503

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


# ── Chat endpoint: upstream LLM failure → 503 ────────────────────────────────


@pytest.mark.asyncio
async def test_chat_returns_503_on_llm_upstream_failure() -> None:
    from backend.app.main import create_app as _create_app

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = _create_app()
    initialize_chat(app)
    app.dependency_overrides[get_db] = _override_get_db

    pipeline = MagicMock()
    pipeline._max_message_length = 4000
    pipeline.run = AsyncMock(side_effect=LLMUnavailableError("502 Bad Gateway"))
    app.dependency_overrides[chat_api._pipeline_dep] = lambda: pipeline

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/chat", json={"message": "hello"})
        assert resp.status_code == 503

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


# ── Sessions endpoint: SQLAlchemy error → 503 ────────────────────────────────


@pytest.mark.asyncio
async def test_create_session_returns_503_on_db_error() -> None:
    from backend.app.main import create_app as _create_app

    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async def _broken_db():
        mock = AsyncMock()
        mock.add = MagicMock()
        mock.commit = AsyncMock(side_effect=SQLAlchemyError("DB down"))
        yield mock

    fake_embedder = _make_fake_embedder()
    app = _create_app()
    initialize_chat(app)
    app.dependency_overrides[get_db] = _broken_db
    app.dependency_overrides[_get_document_embedder] = lambda: fake_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/sessions")
        assert resp.status_code == 503

    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


# ── LLMClient: init failure → LLMNotConfiguredError ──────────────────────────


def test_llm_client_remaps_init_error_to_not_configured() -> None:
    client = LLMClient()
    with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key", "OPENAI_BASE_URL": "https://gw.example/v1"}):
        with patch(
            "backend.app.services.dependency.llm.ChatOpenAI",
            side_effect=RuntimeError("quota exceeded"),
        ):
            with pytest.raises(LLMNotConfiguredError, match="Failed to initialise"):
                client.get()
