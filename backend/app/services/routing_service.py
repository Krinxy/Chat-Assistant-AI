import logging
from typing import Any, Dict

import motor.motor_asyncio

from app.integrations.llm_integration import LLMProvider

logger = logging.getLogger(__name__)

_INTENT_PROMPT = """Classify the user's message into one of these intents:
weather, recommendation, document_search, general_chat, profile_update, help.
Reply with ONLY the intent label."""

_DOMAIN_PROMPT = """Classify the user's message domain into one of these:
weather, entertainment, technology, health, finance, travel, general.
Reply with ONLY the domain label."""


class RoutingService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase = None):
        self._llm = LLMProvider()

    async def classify_intent(self, message: str) -> str:
        try:
            result = await self._llm.chat_completion(
                [{"role": "user", "content": f"{_INTENT_PROMPT}\n\nMessage: {message}"}]
            )
            return result.strip().lower()
        except Exception as exc:
            logger.warning("Intent classification failed: %s", exc)
            return "general_chat"

    async def classify_domain(self, message: str) -> str:
        try:
            result = await self._llm.chat_completion(
                [{"role": "user", "content": f"{_DOMAIN_PROMPT}\n\nMessage: {message}"}]
            )
            return result.strip().lower()
        except Exception as exc:
            logger.warning("Domain classification failed: %s", exc)
            return "general"

    async def route(self, message: str) -> str:
        intent = await self.classify_intent(message)
        routing_map = {
            "weather": "weather_agent",
            "recommendation": "recommendation_agent",
            "document_search": "document_agent",
            "general_chat": "general_agent",
            "profile_update": "general_agent",
            "help": "general_agent",
        }
        return routing_map.get(intent, "general_agent")
