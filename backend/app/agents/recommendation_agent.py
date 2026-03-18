import json
import logging
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.base_agent import BaseAgent
from app.services.chat_service import ChatService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)


class RecommendationAgent(BaseAgent):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._rec_service = RecommendationService(db)
        self._chat_service = ChatService(db)

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        recommendations = await self._rec_service.generate_recommendations(user_id)
        top = recommendations[:3]
        context = "Here are some personalized recommendations:\n" + "\n".join(
            f"- {r['title']}: {r['description']}" for r in top
        )
        return await self._chat_service.process_message(
            user_id=user_id,
            message=message,
            session_id=session_id,
            context=context,
        )
