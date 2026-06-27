"""End-to-end retrieval validation for AP 1A.

Loads the 20-document ground-truth corpus into a real ChromaDB cosine collection using the
real sentence-transformers embedding pipeline and asserts the Definition-of-Done targets:
top-1 hit-rate >= 80 % and a minimum cosine similarity for the best match.

The test skips cleanly when the heavy embedding stack is not installed or the model weights
cannot be loaded (e.g. offline CI), so the mocked unit tests remain the coverage baseline.
"""

from __future__ import annotations

import pytest

from tests.ragfeature.ground_truth_corpus import GROUND_TRUTH_CORPUS

pytest.importorskip("sentence_transformers")
pytest.importorskip("chromadb")

from backend.app.services.core.ingestion.chunker import DocumentChunker  # noqa: E402
from backend.app.services.core.ingestion.embedder import DocumentEmbedder, EmbeddingService  # noqa: E402
from backend.app.config import VectorDbConfig  # noqa: E402
from backend.app.services.dependency.vectordb import VectorDBClient  # noqa: E402

HIT_RATE_THRESHOLD = 0.8
MIN_TOP1_SIMILARITY = 0.25


@pytest.fixture(scope="module")
def embedding_service() -> EmbeddingService:
    service = EmbeddingService()
    try:
        service.embed_query("warmup query to force the model to load")
    except Exception as exc:  # pragma: no cover - environment-dependent (offline / no weights)
        pytest.skip(f"embedding model unavailable: {exc}")

    return service


@pytest.fixture(scope="module")
def populated_collection(embedding_service: EmbeddingService):
    import chromadb

    client = VectorDBClient(
        client=chromadb.EphemeralClient(),
        config=VectorDbConfig(persist_path="unused", collection_name="ground_truth"),
    )
    collection = client.reset_collection()

    chunker = DocumentChunker()
    embedder = DocumentEmbedder(collection=collection, embedding_service=embedding_service)
    for document in GROUND_TRUTH_CORPUS:
        embedder.upsert_chunks(chunker.chunk_document(source=document.doc_id, text=document.text))

    return collection


def test_corpus_is_fully_loaded(populated_collection) -> None:
    assert populated_collection.count() >= len(GROUND_TRUTH_CORPUS)


def test_top1_hit_rate_meets_threshold(populated_collection, embedding_service: EmbeddingService) -> None:
    hits = 0
    best_similarities: list[float] = []

    for document in GROUND_TRUTH_CORPUS:
        query_embedding = embedding_service.embed_query(document.query)
        result = populated_collection.query(
            query_embeddings=[query_embedding],
            n_results=1,
            include=["metadatas", "distances"],
        )
        top_source = result["metadatas"][0][0]["source"]
        top_similarity = 1.0 - float(result["distances"][0][0])
        best_similarities.append(top_similarity)

        if top_source == document.doc_id:
            hits += 1

    hit_rate = hits / len(GROUND_TRUTH_CORPUS)
    mean_similarity = sum(best_similarities) / len(best_similarities)

    assert hit_rate >= HIT_RATE_THRESHOLD, f"top-1 hit-rate {hit_rate:.2f} below {HIT_RATE_THRESHOLD}"
    assert (
        min(best_similarities) >= MIN_TOP1_SIMILARITY
    ), f"weakest top-1 cosine similarity {min(best_similarities):.2f} below {MIN_TOP1_SIMILARITY}"
    assert mean_similarity >= MIN_TOP1_SIMILARITY
