from __future__ import annotations

from typing import TYPE_CHECKING

from ...config import VectorDbConfig, cfg as _cfg

if TYPE_CHECKING:
    from chromadb.api import ClientAPI
    from chromadb.api.models.Collection import Collection


class VectorDBClient:
    """Singleton-friendly wrapper around a ChromaDB PersistentClient.

    The underlying ChromaDB client can be injected for tests; in production it is created
    lazily from the persist_path in cfg.vector_db so documents stay on-premises.
    """

    def __init__(
        self,
        client: ClientAPI | None = None,
        config: VectorDbConfig | None = None,
    ) -> None:
        self._config = config if config is not None else _cfg.vector_db
        self._client = client if client is not None else _create_persistent_client(self._config.persist_path)
        self._collection: Collection | None = None

    @property
    def collection_name(self) -> str:
        return self._config.collection_name

    @property
    def persist_path(self) -> str:
        return self._config.persist_path

    def get_collection(self) -> Collection:
        """Return the document collection, creating it if necessary."""
        if self._collection is None:
            try:
                self._collection = self._client.get_or_create_collection(
                    name=self._config.collection_name,
                    metadata={"hnsw:space": self._config.distance_metric},
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


_vector_db_client: VectorDBClient | None = None


def get_vector_db_client() -> VectorDBClient:
    """Return the process-wide :class:`VectorDBClient` singleton, creating it on first use."""
    global _vector_db_client
    if _vector_db_client is None:
        _vector_db_client = VectorDBClient()

    return _vector_db_client
