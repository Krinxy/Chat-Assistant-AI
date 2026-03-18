import logging
from typing import Any, Dict, List

import motor.motor_asyncio

from app.integrations.embedding import EmbeddingService
from app.integrations.vector_db import VectorDBClient
from app.integrations.llm_integration import LLMProvider

logger = logging.getLogger(__name__)


class RetrievalService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._embedding = EmbeddingService()
        self._vector_db = VectorDBClient()
        self._llm = LLMProvider()

    async def retrieve(
        self, query: str, user_id: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        embedding = self._embedding.embed_text(query)
        results = self._vector_db.search(
            query_embedding=embedding,
            top_k=top_k,
            where={"user_id": user_id},
        )
        return results

    async def rerank(
        self, query: str, documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not documents:
            return documents

        docs_text = "\n".join(
            f"{i+1}. {d['document']}" for i, d in enumerate(documents)
        )
        prompt = (
            f"Given the query: '{query}'\n\n"
            f"Rank these documents by relevance (most relevant first).\n"
            f"Return only a comma-separated list of their numbers.\n\n{docs_text}"
        )

        try:
            response = await self._llm.chat_completion(
                [{"role": "user", "content": prompt}]
            )
            indices = [int(x.strip()) - 1 for x in response.split(",") if x.strip().isdigit()]
            reranked = [documents[i] for i in indices if 0 <= i < len(documents)]
            seen = {id(d) for d in reranked}
            for d in documents:
                if id(d) not in seen:
                    reranked.append(d)
            return reranked
        except Exception as exc:
            logger.warning("Reranking failed, returning original order: %s", exc)
            return documents
