from __future__ import annotations

from typing import Any

import pytest

import backend.app.services.dependency.vectordb as vectordb_module
from backend.app.config import VectorDbConfig
from backend.app.services.dependency.vectordb import (
    VectorDBClient,
    get_vector_db_client,
)


class _FakeChromaClient:
    def __init__(self, delete_error: Exception | None = None) -> None:
        self.created: list[tuple[str, dict[str, Any]]] = []
        self.deleted: list[str] = []
        self._delete_error = delete_error

    def get_or_create_collection(self, name: str, metadata: dict[str, Any]) -> dict[str, Any]:
        self.created.append((name, metadata))
        return {"name": name, "metadata": metadata}

    def delete_collection(self, name: str) -> None:
        if self._delete_error is not None:
            raise self._delete_error
        self.deleted.append(name)


def test_config_uses_documented_defaults() -> None:
    config = VectorDbConfig()

    assert config.persist_path == "./chroma_db"
    assert config.collection_name == "documents"
    assert config.distance_metric == "cosine"


def test_get_collection_requests_cosine_space() -> None:
    fake_client = _FakeChromaClient()
    client = VectorDBClient(client=fake_client, config=VectorDbConfig(collection_name="documents"))

    collection = client.get_collection()

    assert collection["metadata"] == {"hnsw:space": "cosine"}
    assert fake_client.created == [("documents", {"hnsw:space": "cosine"})]
    assert client.collection_name == "documents"


def test_reset_collection_drops_then_recreates() -> None:
    fake_client = _FakeChromaClient()
    client = VectorDBClient(client=fake_client, config=VectorDbConfig(collection_name="docs"))

    client.reset_collection()

    assert fake_client.deleted == ["docs"]
    assert fake_client.created == [("docs", {"hnsw:space": "cosine"})]


def test_reset_collection_tolerates_missing_collection() -> None:
    fake_client = _FakeChromaClient(delete_error=ValueError("collection not found"))
    client = VectorDBClient(client=fake_client, config=VectorDbConfig(collection_name="docs"))

    client.reset_collection()

    assert fake_client.created == [("docs", {"hnsw:space": "cosine"})]


def test_persist_path_set_via_config_injection() -> None:
    fake_client = _FakeChromaClient()
    client = VectorDBClient(client=fake_client, config=VectorDbConfig(persist_path="/data/chroma"))

    assert client.persist_path == "/data/chroma"


def test_persist_path_defaults_to_chroma_db() -> None:
    from backend.app.config import cfg

    fake_client = _FakeChromaClient()
    client = VectorDBClient(client=fake_client)

    assert client.persist_path == cfg.vector_db.persist_path


def test_distance_metric_used_in_collection_metadata() -> None:
    fake_client = _FakeChromaClient()
    client = VectorDBClient(client=fake_client, config=VectorDbConfig(distance_metric="l2"))

    client.get_collection()

    assert fake_client.created[0][1] == {"hnsw:space": "l2"}


def test_get_vector_db_client_returns_singleton(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(vectordb_module, "_vector_db_client", None)
    monkeypatch.setattr(
        vectordb_module,
        "_create_persistent_client",
        lambda persist_path: _FakeChromaClient(),
    )

    first = get_vector_db_client()
    second = get_vector_db_client()

    assert first is second
