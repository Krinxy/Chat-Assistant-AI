from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from backend.app.services.core.rag.retriever import ChromaRetriever, RetrievedChunk


def _collection(documents, metadatas, distances) -> MagicMock:
    collection = MagicMock()
    collection.query.return_value = {
        "documents": [documents],
        "metadatas": [metadatas],
        "distances": [distances],
    }
    return collection


def _embedding_service() -> MagicMock:
    service = MagicMock()
    service.embed_query.return_value = [0.1, 0.2, 0.3]
    return service


def _retriever(collection: MagicMock, *, k: int = 4, threshold: float = 0.3) -> ChromaRetriever:
    return ChromaRetriever(
        embedding_service=_embedding_service(),
        collection_provider=lambda: collection,
        k=k,
        similarity_threshold=threshold,
    )


def test_retrieve_returns_chunks_above_threshold() -> None:
    collection = _collection(
        documents=["alpha", "beta"],
        metadatas=[{"source": "doc1", "chunk_index": 0}, {"source": "doc2", "chunk_index": 3}],
        distances=[0.1, 0.9],  # similarities 0.9 and 0.1
    )
    chunks = _retriever(collection).retrieve("question")

    assert chunks == [RetrievedChunk(text="alpha", source="doc1", chunk_index=0, similarity=0.9)]


def test_retrieve_passes_k_to_collection() -> None:
    collection = _collection(["alpha"], [{"source": "doc1", "chunk_index": 0}], [0.1])
    _retriever(collection, k=7).retrieve("question")

    assert collection.query.call_args.kwargs["n_results"] == 7


def test_retrieve_blank_query_short_circuits() -> None:
    collection = _collection(["alpha"], [{"source": "doc1", "chunk_index": 0}], [0.1])
    assert _retriever(collection).retrieve("   ") == []
    collection.query.assert_not_called()


def test_retrieve_empty_collection_returns_empty() -> None:
    collection = _collection([], [], [])
    assert _retriever(collection).retrieve("question") == []


def test_retrieve_swallows_backend_errors() -> None:
    collection = MagicMock()
    collection.query.side_effect = RuntimeError("chroma down")
    assert _retriever(collection).retrieve("question") == []


def test_retrieve_handles_missing_metadata_fields() -> None:
    collection = _collection(["alpha"], [None], [0.2])
    chunks = _retriever(collection).retrieve("question")

    assert chunks == [RetrievedChunk(text="alpha", source="unknown", chunk_index=-1, similarity=0.8)]


def test_rejects_non_positive_k() -> None:
    with pytest.raises(ValueError):
        ChromaRetriever(embedding_service=_embedding_service(), collection_provider=MagicMock(), k=0)


def test_from_config_reads_top_k_and_threshold() -> None:
    retriever = ChromaRetriever.from_config(
        {"retriever": {"top_k": 8, "similarity_threshold": 0.5}, "embedder": {"model": "all-MiniLM-L6-v2"}},
        embedding_service=_embedding_service(),
    )
    assert retriever.k == 8
    assert retriever.similarity_threshold == 0.5
