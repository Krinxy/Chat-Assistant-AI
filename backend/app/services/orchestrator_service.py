import logging
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.orchestrator_agent import OrchestratorAgent
from app.services.behavior_tracking_service import BehaviorTrackingService
from app.services.user_profile_service import UserProfileService
from app.services.routing_service import RoutingService

logger = logging.getLogger(__name__)


class OrchestratorService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._db = db
        self._agent = OrchestratorAgent(db)
        self._behavior = BehaviorTrackingService(db)
        self._profile = UserProfileService(db)
        self._routing = RoutingService(db)

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Classify intent and domain
        intent = await self._routing.classify_intent(message)
        domain = await self._routing.classify_domain(message)

        # Track behavior event
        await self._behavior.track_event(
            user_id,
            "chat_message",
            {"intent": intent, "domain": domain, "message_length": len(message)},
        )

        # Delegate to orchestrator agent
        result = await self._agent.process(
            user_id=user_id,
            message=message,
            session_id=session_id,
            intent=intent,
            domain=domain,
        )

        return result
