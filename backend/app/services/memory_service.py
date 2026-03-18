import logging
import uuid
from typing import Any, Dict, List

import motor.motor_asyncio

from app.integrations.embedding import EmbeddingService
from app.integrations.vector_db import VectorDBClient

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._embedding = EmbeddingService()
        self._vector_db = VectorDBClient(collection_name="user_memory")
        self._db = db

    async def store_memory(
        self, user_id: str, content: str, metadata: Dict[str, Any] = None
    ) -> str:
        mem_id = str(uuid.uuid4())
        embedding = self._embedding.embed_text(content)
        meta = {"user_id": user_id, **(metadata or {})}
        self._vector_db.add_documents(
            ids=[mem_id],
            documents=[content],
            embeddings=[embedding],
            metadatas=[meta],
        )
        return mem_id

    async def retrieve_relevant(
        self, user_id: str, query: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        embedding = self._embedding.embed_text(query)
        results = self._vector_db.search(
            query_embedding=embedding,
            top_k=top_k,
            where={"user_id": user_id},
        )
        return results

    async def clear_memory(self, user_id: str) -> None:
        self._vector_db.delete_where({"user_id": user_id})
