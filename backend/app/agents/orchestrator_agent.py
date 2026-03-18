import logging
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.base_agent import BaseAgent
from app.agents.general_agent import GeneralAgent
from app.agents.weather_agent import WeatherAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.agents.document_agent import DocumentAgent

logger = logging.getLogger(__name__)

_AGENT_MAP = {
    "weather_agent": WeatherAgent,
    "recommendation_agent": RecommendationAgent,
    "document_agent": DocumentAgent,
    "general_agent": GeneralAgent,
}


class OrchestratorAgent(BaseAgent):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._db = db
        self._agents: Dict[str, BaseAgent] = {}

    def _get_agent(self, name: str) -> BaseAgent:
        if name not in self._agents:
            cls = _AGENT_MAP.get(name, GeneralAgent)
            self._agents[name] = cls(self._db)
        return self._agents[name]

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        intent: str = "general_chat",
        domain: str = "general",
        **kwargs,
    ) -> Dict[str, Any]:
        agent_name_map = {
            "weather": "weather_agent",
            "recommendation": "recommendation_agent",
            "document_search": "document_agent",
        }
        agent_name = agent_name_map.get(intent, "general_agent")
        agent = self._get_agent(agent_name)

        logger.debug(
            "Routing user=%s intent=%s to agent=%s", user_id, intent, agent_name
        )
        return await agent.process(
            user_id=user_id,
            message=message,
            session_id=session_id,
            intent=intent,
            domain=domain,
        )
