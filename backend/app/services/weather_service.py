import logging
from typing import Any, Dict, List

import motor.motor_asyncio

from app.integrations.weather_integration import WeatherClient
from app.repositories.profile_repository import ProfileRepository

logger = logging.getLogger(__name__)


class WeatherService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._client = WeatherClient()
        self._profile_repo = ProfileRepository(db)

    async def get_weather(self, city: str) -> Dict[str, Any]:
        return await self._client.get_weather(city)

    async def get_saved_locations(self, user_id: str) -> List[str]:
        return await self._profile_repo.get_all_locations(user_id)

    async def add_location(self, user_id: str, city: str) -> dict:
        return await self._profile_repo.add_location(user_id, city)

    async def suggest_cities(self, user_id: str) -> List[str]:
        saved = await self._profile_repo.get_all_locations(user_id)
        defaults = ["London", "New York", "Tokyo", "Paris", "Sydney"]
        suggestions = list(dict.fromkeys(saved + defaults))
        return suggestions[:10]
