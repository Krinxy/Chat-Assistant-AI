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

from .conftest import FakeChromaCollection, HashingEmbeddingModel  # noqa: E402

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db():
    async with _Session() as session:
        yield session


def _make_fake_embedder() -> DocumentEmbedder:
    return DocumentEmbedder(FakeChromaCollection(), EmbeddingService(model=HashingEmbeddingModel()))


@pytest_asyncio.fixture()
async def admin_client():
    """Mock-auth client with admin role."""
    prev_mode = os.environ.get("AUTH_MODE")
    prev_role = os.environ.get("MOCK_USER_ROLE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "admin"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    fake_embedder = _make_fake_embedder()
    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = lambda: fake_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    os.environ.pop("AUTH_MODE", None) if prev_mode is None else os.environ.__setitem__("AUTH_MODE", prev_mode)
    os.environ.pop("MOCK_USER_ROLE", None) if prev_role is None else os.environ.__setitem__("MOCK_USER_ROLE", prev_role)


@pytest_asyncio.fixture()
async def user_client():
    """Mock-auth client with user (non-admin) role."""
    prev_mode = os.environ.get("AUTH_MODE")
    prev_role = os.environ.get("MOCK_USER_ROLE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    fake_embedder = _make_fake_embedder()
    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[_get_document_embedder] = lambda: fake_embedder

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    os.environ.pop("AUTH_MODE", None) if prev_mode is None else os.environ.__setitem__("AUTH_MODE", prev_mode)
    os.environ.pop("MOCK_USER_ROLE", None) if prev_role is None else os.environ.__setitem__("MOCK_USER_ROLE", prev_role)


@pytest_asyncio.fixture()
async def anon_client():
    """JWT-mode client with no token — all protected endpoints return 401."""
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


# ── helpers ──────────────────────────────────────────────────────────────────


def _txt_file(content: str = "Hello world") -> dict:
    return {"file": ("report.txt", content.encode(), "text/plain")}


def _zip_file() -> dict:
    return {"file": ("archive.zip", b"PK\x03\x04", "application/zip")}


# ── GET /api/documents ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_documents_returns_empty_for_fresh_db(admin_client: AsyncClient) -> None:
    resp = await admin_client.get("/api/documents")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_documents_requires_auth(anon_client: AsyncClient) -> None:
    resp = await anon_client.get("/api/documents")
    assert resp.status_code == 401


# ── POST /api/documents/upload ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_txt_document_returns_201(admin_client: AsyncClient) -> None:
    resp = await admin_client.post("/api/documents/upload", files=_txt_file("Some content here"))
    assert resp.status_code == 201
    body = resp.json()
    assert body["filename"] == "report.txt"
    assert body["chunk_count"] >= 1
    assert "id" in body
    assert "uploaded_at" in body


@pytest.mark.asyncio
async def test_upload_unsupported_format_returns_415(admin_client: AsyncClient) -> None:
    resp = await admin_client.post("/api/documents/upload", files=_zip_file())
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_upload_duplicate_content_returns_409(admin_client: AsyncClient) -> None:
    await admin_client.post("/api/documents/upload", files=_txt_file("Unique content"))
    resp = await admin_client.post("/api/documents/upload", files=_txt_file("Unique content"))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_upload_requires_auth(anon_client: AsyncClient) -> None:
    resp = await anon_client.post("/api/documents/upload", files=_txt_file())
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upload_requires_admin_role(user_client: AsyncClient) -> None:
    resp = await user_client.post("/api/documents/upload", files=_txt_file())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_upload_document_appears_in_list(admin_client: AsyncClient) -> None:
    await admin_client.post("/api/documents/upload", files=_txt_file("List me"))
    resp = await admin_client.get("/api/documents")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["filename"] == "report.txt"


# ── DELETE /api/documents/{id} ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_document_returns_204(admin_client: AsyncClient) -> None:
    upload = await admin_client.post("/api/documents/upload", files=_txt_file("Delete me"))
    doc_id = upload.json()["id"]
    resp = await admin_client.delete(f"/api/documents/{doc_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_removes_document_from_list(admin_client: AsyncClient) -> None:
    upload = await admin_client.post("/api/documents/upload", files=_txt_file("Remove from list"))
    doc_id = upload.json()["id"]
    await admin_client.delete(f"/api/documents/{doc_id}")
    resp = await admin_client.get("/api/documents")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_delete_nonexistent_document_returns_404(admin_client: AsyncClient) -> None:
    resp = await admin_client.delete("/api/documents/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_requires_admin_role(user_client: AsyncClient) -> None:
    resp = await user_client.delete("/api/documents/some-id")
    assert resp.status_code == 403
