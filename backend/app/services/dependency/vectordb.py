from __future__ import annotations

import os
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from chromadb.api import ClientAPI
    from chromadb.api.models.Collection import Collection

_DEFAULT_PERSIST_PATH = "./chroma_db"
_DEFAULT_COLLECTION_NAME = "documents"
_COSINE_SPACE = "cosine"


@dataclass(frozen=True)
class VectorDBConfig:
    persist_path: str = _DEFAULT_PERSIST_PATH
    collection_name: str = _DEFAULT_COLLECTION_NAME


class VectorDBClient:
    """Singleton-friendly wrapper around a ChromaDB PersistentClient using cosine similarity.

    The underlying ChromaDB client can be injected for tests; in production it is created
    lazily from a persistent on-disk path so documents stay on-premises.
    """

    def __init__(
        self,
        client: ClientAPI | None = None,
        config: VectorDBConfig | None = None,
    ) -> None:
        self._config = config or VectorDBConfig(persist_path=_resolve_persist_path_from_env())
        self._client = client if client is not None else _create_persistent_client(self._config.persist_path)
        self._collection: Collection | None = None

    @property
    def collection_name(self) -> str:
        return self._config.collection_name

    @property
    def persist_path(self) -> str:
        return self._config.persist_path

    def get_collection(self) -> Collection:
        """Return the cosine-similarity document collection, creating it if necessary."""
        if self._collection is None:
            try:
                self._collection = self._client.get_or_create_collection(
                    name=self._config.collection_name,
                    metadata={"hnsw:space": _COSINE_SPACE},
                )
            except Exception as exc:
                raise RuntimeError(f"ChromaDB collection '{self._config.collection_name}' unavailable: {exc}") from exc
        return self._collection

    def reset_collection(self) -> Collection:
        """Drop and recreate the document collection (used for ingestion resets and tests)."""
        try:
            self._client.delete_collection(self._config.collection_name)
        except _collection_not_found_errors():
            # ChromaDB raises when the collection does not exist yet; recreating is still safe.
            pass
        self._collection = None
        return self.get_collection()


def _collection_not_found_errors() -> tuple[type[BaseException], ...]:
    errors: list[type[BaseException]] = [ValueError, KeyError]
    try:
        from chromadb.errors import NotFoundError

        errors.append(NotFoundError)
    except ImportError:
        pass

    return tuple(errors)


def _create_persistent_client(persist_path: str) -> ClientAPI:
    import chromadb
    from chromadb.config import Settings

    try:
        return chromadb.PersistentClient(
            path=persist_path,
            settings=Settings(anonymized_telemetry=False),
        )
    except Exception as exc:
        raise RuntimeError(f"ChromaDB client could not be created at '{persist_path}': {exc}") from exc


def _resolve_persist_path_from_env() -> str:
    configured_path = os.getenv("CHROMA_PATH", "").strip()
    if len(configured_path) == 0:
        return _DEFAULT_PERSIST_PATH

    return configured_path


_vector_db_client: VectorDBClient | None = None


def get_vector_db_client() -> VectorDBClient:
    """Return the process-wide :class:`VectorDBClient` singleton, creating it on first use."""
    global _vector_db_client
    if _vector_db_client is None:
        _vector_db_client = VectorDBClient()

    return _vector_db_client
