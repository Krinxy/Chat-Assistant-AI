import logging
from typing import Any, Dict, List

import motor.motor_asyncio

from app.repositories.profile_repository import ProfileRepository

logger = logging.getLogger(__name__)


class UserProfileService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._repo = ProfileRepository(db)

    async def get_profile(self, user_id: str) -> dict:
        profile = await self._repo.get_by_user_id(user_id)
        if not profile:
            profile = await self._repo.create(user_id)
        return profile

    async def update_profile(self, user_id: str, updates: Dict[str, Any]) -> dict:
        allowed_keys = {"interests", "preferences", "locations", "activity_times"}
        filtered = {k: v for k, v in updates.items() if k in allowed_keys}
        return await self._repo.update(user_id, filtered)

    async def update_interests(self, user_id: str, interests: List[str]) -> dict:
        return await self._repo.update(user_id, {"interests": interests})

    async def update_preferences(
        self, user_id: str, preferences: Dict[str, Any]
    ) -> dict:
        return await self._repo.update(user_id, {"preferences": preferences})
