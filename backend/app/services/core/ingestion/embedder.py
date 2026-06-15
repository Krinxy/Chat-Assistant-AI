from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol, Sequence, cast

from .chunker import Chunk

if TYPE_CHECKING:
    from chromadb.api.models.Collection import Collection
    from chromadb.api.types import Embeddings, Metadatas

DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


class SupportsEncode(Protocol):
    """Structural type for sentence-transformers-like models used for embedding text."""

    def encode(self, sentences: Sequence[str], normalize_embeddings: bool = ...) -> object: ...


class EmbeddingService:
    """Embed text with a sentence-transformers model, loaded lazily so imports stay cheap.

    A pre-built model can be injected for tests to avoid downloading weights.
    """

    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL, model: SupportsEncode | None = None) -> None:
        self._model_name = model_name
        self._model = model

    @property
    def model_name(self) -> str:
        return self._model_name

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Return normalized embeddings for a batch of texts (used during ingestion)."""
        if len(texts) == 0:
            return []

        model = self._ensure_model()
        vectors = model.encode(list(texts), normalize_embeddings=True)
        return _to_float_matrix(vectors)

    def embed_query(self, query: str) -> list[float]:
        """Return the normalized embedding for a single query (used during retrieval)."""
        return self.embed_texts([query])[0]

    def _ensure_model(self) -> SupportsEncode:
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self._model_name)

        return self._model


@dataclass(frozen=True)
class UpsertResult:
    chunk_ids: list[str]
    embedded_count: int


class DocumentEmbedder:
    """Embed document chunks and upsert them into a ChromaDB collection.

    The collection is injected (a real ChromaDB collection in production, a fake in tests),
    so this orchestration layer can be unit-tested without a running vector store.
    """

    def __init__(self, collection: Collection, embedding_service: EmbeddingService) -> None:
        self._collection = collection
        self._embeddings = embedding_service

    def upsert_chunks(self, chunks: Sequence[Chunk]) -> UpsertResult:
        """Embed every chunk and upsert it under a stable, content-addressed id."""
        if len(chunks) == 0:
            return UpsertResult(chunk_ids=[], embedded_count=0)

        ids = [build_chunk_id(chunk) for chunk in chunks]
        documents = [chunk.text for chunk in chunks]
        metadatas = [{"source": chunk.source, "chunk_index": chunk.chunk_index} for chunk in chunks]
        embeddings = self._embeddings.embed_texts(documents)

        # ChromaDB accepts plain float lists at runtime; its stubs are narrower, so cast at the boundary.
        self._collection.upsert(
            ids=ids,
            embeddings=cast("Embeddings", embeddings),
            documents=documents,
            metadatas=cast("Metadatas", metadatas),
        )
        return UpsertResult(chunk_ids=ids, embedded_count=len(ids))


def build_chunk_id(chunk: Chunk) -> str:
    """Build a deterministic chunk id from its source, index and content hash."""
    content_hash = hashlib.sha256(chunk.text.encode("utf-8")).hexdigest()[:16]
    return f"{chunk.source}:{chunk.chunk_index}:{content_hash}"


def _to_float_matrix(vectors: object) -> list[list[float]]:
    tolist = getattr(vectors, "tolist", None)
    raw = tolist() if callable(tolist) else vectors
    return [[float(value) for value in row] for row in raw]  # type: ignore[union-attr]
