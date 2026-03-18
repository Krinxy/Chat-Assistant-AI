import logging
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.base_agent import BaseAgent
from app.services.chat_service import ChatService
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


class DocumentAgent(BaseAgent):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._retrieval_service = RetrievalService(db)
        self._chat_service = ChatService(db)

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        results = await self._retrieval_service.retrieve(
            query=message, user_id=user_id, top_k=3
        )

        if results:
            context = "Relevant document excerpts:\n" + "\n---\n".join(
                r["document"] for r in results
            )
        else:
            context = "No relevant documents found in your uploaded files."

        return await self._chat_service.process_message(
            user_id=user_id,
            message=message,
            session_id=session_id,
            context=context,
        )
