from __future__ import annotations

from typing import Sequence

import numpy as np

from backend.app.services.core.ingestion.chunker import Chunk
from backend.app.services.core.ingestion.embedder import (
    DocumentEmbedder,
    EmbeddingService,
    UpsertResult,
    build_chunk_id,
)
from tests.ragfeature.conftest import FakeChromaCollection, HashingEmbeddingModel


def test_build_chunk_id_is_deterministic_and_content_sensitive() -> None:
    chunk = Chunk(source="doc.txt", chunk_index=2, text="hello")
    same = Chunk(source="doc.txt", chunk_index=2, text="hello")
    different = Chunk(source="doc.txt", chunk_index=2, text="hello world")

    assert build_chunk_id(chunk) == build_chunk_id(same)
    assert build_chunk_id(chunk) != build_chunk_id(different)
    assert build_chunk_id(chunk).startswith("doc.txt:2:")


def test_embedding_service_returns_one_vector_per_text() -> None:
    service = EmbeddingService(model=HashingEmbeddingModel(dimensions=16))

    vectors = service.embed_texts(["alpha", "beta", "gamma"])

    assert len(vectors) == 3
    assert all(len(vector) == 16 for vector in vectors)


def test_embedding_service_handles_empty_input() -> None:
    service = EmbeddingService(model=HashingEmbeddingModel())

    assert service.embed_texts([]) == []


def test_embedding_service_embed_query_returns_single_vector() -> None:
    service = EmbeddingService(model=HashingEmbeddingModel(dimensions=8))

    vector = service.embed_query("a question")

    assert len(vector) == 8


def test_embedding_service_converts_numpy_output_to_float_lists() -> None:
    class _NumpyModel:
        def encode(self, sentences: Sequence[str], normalize_embeddings: bool = True) -> np.ndarray:
            _ = normalize_embeddings
            return np.arange(len(sentences) * 3, dtype=np.float32).reshape(len(sentences), 3)

    service = EmbeddingService(model=_NumpyModel())

    vectors = service.embed_texts(["x", "y"])

    assert vectors == [[0.0, 1.0, 2.0], [3.0, 4.0, 5.0]]
    assert all(isinstance(value, float) for row in vectors for value in row)


def test_document_embedder_upserts_chunks_into_collection(fake_collection: FakeChromaCollection) -> None:
    service = EmbeddingService(model=HashingEmbeddingModel())
    embedder = DocumentEmbedder(collection=fake_collection, embedding_service=service)
    chunks = [
        Chunk(source="doc.txt", chunk_index=0, text="first chunk"),
        Chunk(source="doc.txt", chunk_index=1, text="second chunk"),
    ]

    result = embedder.upsert_chunks(chunks)

    assert isinstance(result, UpsertResult)
    assert result.embedded_count == 2
    assert fake_collection.count() == 2

    stored = fake_collection.get(ids=result.chunk_ids)
    assert stored["documents"] == ["first chunk", "second chunk"]
    assert stored["metadatas"][0] == {"source": "doc.txt", "chunk_index": 0}


def test_document_embedder_ignores_empty_chunk_list(fake_collection: FakeChromaCollection) -> None:
    service = EmbeddingService(model=HashingEmbeddingModel())
    embedder = DocumentEmbedder(collection=fake_collection, embedding_service=service)

    result = embedder.upsert_chunks([])

    assert result == UpsertResult(chunk_ids=[], embedded_count=0)
    assert fake_collection.count() == 0
