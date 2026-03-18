import logging
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.base_agent import BaseAgent
from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)


class GeneralAgent(BaseAgent):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._chat_service = ChatService(db)

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        return await self._chat_service.process_message(
            user_id=user_id,
            message=message,
            session_id=session_id,
            context=kwargs.get("context"),
        )
