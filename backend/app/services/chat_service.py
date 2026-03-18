import logging
from typing import Dict, List, Optional

import motor.motor_asyncio

from app.integrations.llm_integration import LLMProvider
from app.repositories.chat_repository import ChatRepository

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._repo = ChatRepository(db)
        self._llm = LLMProvider()

    async def create_session(self, user_id: str, title: Optional[str] = None) -> dict:
        return await self._repo.create_session(user_id, title=title)

    async def get_chat_history(self, user_id: str, session_id: str) -> List[dict]:
        session = await self._repo.get_session(session_id)
        if not session or session["user_id"] != user_id:
            return []
        return await self._repo.get_messages(session_id)

    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, str]:
        if not session_id:
            session = await self._repo.create_session(user_id)
            session_id = str(session["_id"])

        await self._repo.add_message(session_id, user_id, "user", message)

        history = await self._repo.get_messages(session_id)
        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in history
            if m["role"] in ("user", "assistant")
        ]

        if context:
            messages = [
                {"role": "system", "content": f"Context:\n{context}"}
            ] + messages

        try:
            reply = await self._llm.chat_completion(messages)
        except Exception as exc:
            logger.error("LLM error in chat_service: %s", exc)
            reply = "I'm sorry, I encountered an error processing your request."

        await self._repo.add_message(session_id, user_id, "assistant", reply)

        return {"session_id": session_id, "message": reply, "role": "assistant"}
