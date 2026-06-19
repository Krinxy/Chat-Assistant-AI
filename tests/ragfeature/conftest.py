from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from typing import Any, Sequence

import pytest


@dataclass
class _StoredRecord:
    embedding: list[float]
    document: str
    metadata: dict[str, Any]


@dataclass
class FakeChromaCollection:
    """In-memory stand-in for a ChromaDB cosine collection used in unit tests.

    Implements just enough of the ChromaDB Collection API (``upsert``/``query``/``get``/
    ``delete``/``count``) and reproduces cosine ranking so retrieval logic can be tested
    without a running vector store.
    """

    name: str = "documents"
    _records: dict[str, _StoredRecord] = field(default_factory=dict)

    def upsert(
        self,
        *,
        ids: Sequence[str],
        embeddings: Sequence[Sequence[float]],
        documents: Sequence[str],
        metadatas: Sequence[dict[str, Any]],
    ) -> None:
        for record_id, embedding, document, metadata in zip(ids, embeddings, documents, metadatas):
            self._records[record_id] = _StoredRecord(
                embedding=[float(value) for value in embedding],
                document=document,
                metadata=dict(metadata),
            )

    def query(
        self,
        *,
        query_embeddings: Sequence[Sequence[float]],
        n_results: int,
        include: Sequence[str] | None = None,
    ) -> dict[str, list[list[Any]]]:
        _ = include
        query_vector = [float(value) for value in query_embeddings[0]]
        ranked = sorted(
            self._records.items(),
            key=lambda item: _cosine_distance(query_vector, item[1].embedding),
        )[:n_results]

        return {
            "ids": [[record_id for record_id, _ in ranked]],
            "documents": [[record.document for _, record in ranked]],
            "metadatas": [[record.metadata for _, record in ranked]],
            "distances": [[_cosine_distance(query_vector, record.embedding) for _, record in ranked]],
        }

    def get(self, *, ids: Sequence[str] | None = None, include: Sequence[str] | None = None) -> dict[str, list[Any]]:
        _ = include
        selected = list(self._records) if ids is None else [record_id for record_id in ids if record_id in self._records]
        return {
            "ids": selected,
            "documents": [self._records[record_id].document for record_id in selected],
            "metadatas": [self._records[record_id].metadata for record_id in selected],
        }

    def delete(self, *, ids: Sequence[str] | None = None, where: dict[str, Any] | None = None) -> None:
        if where is not None:
            to_delete = [rid for rid, r in self._records.items() if all(r.metadata.get(k) == v for k, v in where.items())]
            for rid in to_delete:
                self._records.pop(rid, None)
        elif ids is not None:
            for record_id in ids:
                self._records.pop(record_id, None)

    def count(self) -> int:
        return len(self._records)


class HashingEmbeddingModel:
    """Deterministic sentence-transformers-like model that derives vectors from text hashes."""

    def __init__(self, dimensions: int = 32) -> None:
        self._dimensions = dimensions

    def encode(self, sentences: Sequence[str], normalize_embeddings: bool = True) -> list[list[float]]:
        vectors = [self._embed_one(text) for text in sentences]
        if normalize_embeddings:
            vectors = [_normalize(vector) for vector in vectors]
        return vectors

    def _embed_one(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [digest[index % len(digest)] / 255.0 for index in range(self._dimensions)]


def _cosine_distance(left: Sequence[float], right: Sequence[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(a * a for a in left))
    norm_right = math.sqrt(sum(b * b for b in right))
    if norm_left == 0.0 or norm_right == 0.0:
        return 1.0

    return 1.0 - (dot / (norm_left * norm_right))


def _normalize(vector: Sequence[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0.0:
        return [0.0 for _ in vector]

    return [value / norm for value in vector]


@pytest.fixture
def fake_collection() -> FakeChromaCollection:
    return FakeChromaCollection()


@pytest.fixture
def hashing_embedding_model() -> HashingEmbeddingModel:
    return HashingEmbeddingModel()
