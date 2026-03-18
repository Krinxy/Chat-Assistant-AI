import logging
from typing import Any, Dict, List

import motor.motor_asyncio

from app.integrations.embedding import EmbeddingService
from app.integrations.vector_db import VectorDBClient
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


class RetrievalPipeline:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._embedding = EmbeddingService()
        self._vector_db = VectorDBClient()
        self._retrieval_service = RetrievalService(db)

    async def run(
        self, query: str, user_id: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        # Step 1: embed query
        embedding = self._embedding.embed_text(query)
        # Step 2: search vectors
        results = self._vector_db.search(
            query_embedding=embedding,
            top_k=top_k * 2,
            where={"user_id": user_id},
        )
        # Step 3: rerank
        reranked = await self._retrieval_service.rerank(query, results)
        # Step 4: augment with similarity scores
        augmented = []
        for doc in reranked[:top_k]:
            doc["similarity"] = round(1 - doc.get("distance", 0), 4)
            augmented.append(doc)
        return augmented
