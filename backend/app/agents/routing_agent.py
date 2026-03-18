import logging
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.base_agent import BaseAgent
from app.services.routing_service import RoutingService

logger = logging.getLogger(__name__)


class RoutingAgent(BaseAgent):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase = None):
        self._routing_service = RoutingService(db)

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        intent = await self._routing_service.classify_intent(message)
        domain = await self._routing_service.classify_domain(message)
        agent_name = await self._routing_service.route(message)

        return {
            "intent": intent,
            "domain": domain,
            "agent": agent_name,
        }
