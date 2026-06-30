from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Callable, Mapping, Protocol, cast, runtime_checkable

from ...dependency.vectordb import get_vector_db_client
from ..ingestion.embedder import DEFAULT_EMBEDDING_MODEL, EmbeddingService

if TYPE_CHECKING:
    from chromadb.api.models.Collection import Collection
    from chromadb.api.types import Embeddings

_logger = logging.getLogger(__name__)

# ChromaDB returns cosine *distance* in [0, 2]; similarity = 1 - distance. Chunks below this
# similarity are dropped so irrelevant matches never reach the prompt (mirrors the AP 1A
# retrieval-validation threshold). Tunable via rag.retriever.similarity_threshold in backend.yaml.
_DEFAULT_TOP_K = 4
_DEFAULT_SIMILARITY_THRESHOLD = 0.3

# A zero-argument factory yielding the ChromaDB collection. Resolving the collection is
# deferred to query time so constructing a retriever (e.g. at app startup) never forces the
# vector DB client to be created eagerly, and a transient outage degrades to "no context"
# instead of crashing the pipeline.
CollectionProvider = Callable[[], "Collection"]


@dataclass(frozen=True)
class RetrievedChunk:
    """A single retrieval hit: the chunk text plus its provenance and match score."""

    text: str
    source: str
    chunk_index: int
    similarity: float


@runtime_checkable
class Retriever(Protocol):
    """Structural type for anything the RAG pipeline can retrieve context from."""

    def retrieve(self, query: str) -> list[RetrievedChunk]: ...


class ChromaRetriever:
    """Dense similarity search over a ChromaDB collection.

    Embeds the query with the same sentence-transformers model used for ingestion, runs a
    cosine search, and returns the top-k hits above ``similarity_threshold`` as
    :class:`RetrievedChunk` records carrying their source document and chunk index.
    """

    def __init__(
        self,
        embedding_service: EmbeddingService,
        collection_provider: CollectionProvider,
        k: int = _DEFAULT_TOP_K,
        similarity_threshold: float = _DEFAULT_SIMILARITY_THRESHOLD,
    ) -> None:
        if k <= 0:
            raise ValueError("k must be greater than zero")
        self._embeddings = embedding_service
        self._collection_provider = collection_provider
        self._k = k
        self._similarity_threshold = similarity_threshold

    @property
    def k(self) -> int:
        return self._k

    @property
    def similarity_threshold(self) -> float:
        return self._similarity_threshold

    def retrieve(self, query: str) -> list[RetrievedChunk]:
        """Return the top-k chunks most similar to *query*, filtered by the similarity threshold.

        Returns an empty list on a blank query, an empty collection, or a vector-DB error —
        the caller treats "no chunks" as the grounded fallback rather than failing the request.
        """
        if not query.strip():
            return []

        try:
            collection = self._collection_provider()
            query_embedding = self._embeddings.embed_query(query)
            results = collection.query(
                # ChromaDB accepts plain float lists at runtime; its stubs are narrower, so cast.
                query_embeddings=cast("Embeddings", [query_embedding]),
                n_results=self._k,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            _logger.warning("retrieval failed; falling back to empty context: %s", exc)
            return []

        return self._parse_results(results)

    def _parse_results(self, results: Mapping[str, Any]) -> list[RetrievedChunk]:
        documents = self._first_row(results, "documents")
        metadatas = self._first_row(results, "metadatas")
        distances = self._first_row(results, "distances")
        if not documents:
            return []

        chunks: list[RetrievedChunk] = []
        for text, metadata, distance in zip(documents, metadatas, distances):
            similarity = 1.0 - float(distance)
            if similarity < self._similarity_threshold:
                continue
            meta = metadata or {}
            chunks.append(
                RetrievedChunk(
                    text=str(text),
                    source=str(meta.get("source", "unknown")),
                    chunk_index=int(meta.get("chunk_index", -1)),
                    similarity=similarity,
                )
            )
        return chunks

    @staticmethod
    def _first_row(results: Mapping[str, Any], key: str) -> list:
        """Unwrap ChromaDB's per-query nesting (``{key: [[...]]}``) for our single query."""
        rows = results.get(key) or []
        return list(rows[0]) if rows else []

    @classmethod
    def from_config(cls, rag_config: dict, embedding_service: EmbeddingService | None = None) -> "ChromaRetriever":
        """Build a retriever from the ``rag`` config section, resolving the collection lazily."""
        retriever_cfg = rag_config.get("retriever", {})
        embedder_cfg = rag_config.get("embedder", {})
        service = embedding_service or EmbeddingService(model_name=str(embedder_cfg.get("model", DEFAULT_EMBEDDING_MODEL)))
        return cls(
            embedding_service=service,
            collection_provider=lambda: get_vector_db_client().get_collection(),
            k=int(retriever_cfg.get("top_k", _DEFAULT_TOP_K)),
            similarity_threshold=float(retriever_cfg.get("similarity_threshold", _DEFAULT_SIMILARITY_THRESHOLD)),
        )
