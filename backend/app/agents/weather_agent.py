import logging
import re
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.agents.base_agent import BaseAgent
from app.services.chat_service import ChatService
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)


class WeatherAgent(BaseAgent):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._weather_service = WeatherService(db)
        self._chat_service = ChatService(db)

    def _extract_city(self, message: str) -> Optional[str]:
        patterns = [
            r"weather (?:in|for|at) ([A-Za-z\s]+)",
            r"(?:in|for|at) ([A-Za-z\s]+)(?:'s)? weather",
            r"([A-Za-z\s]+) weather",
        ]
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        city = self._extract_city(message)

        if not city:
            saved = await self._weather_service.get_saved_locations(user_id)
            city = saved[0] if saved else "London"

        try:
            weather = await self._weather_service.get_weather(city)
            context = (
                f"Current weather in {weather['city']}: "
                f"{weather['description']}, "
                f"temperature {weather['temperature']}°C, "
                f"feels like {weather['feels_like']}°C, "
                f"humidity {weather['humidity']}%, "
                f"wind {weather['wind_speed']} m/s."
            )
        except Exception as exc:
            logger.warning("Weather fetch failed: %s", exc)
            context = f"Unable to fetch weather data for {city}."

        return await self._chat_service.process_message(
            user_id=user_id,
            message=message,
            session_id=session_id,
            context=context,
        )
