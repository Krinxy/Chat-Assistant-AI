from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import motor.motor_asyncio


class ProfileRepository:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self.collection = db["user_profiles"]

    async def get_by_user_id(self, user_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"user_id": user_id})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def create(self, user_id: str) -> dict:
        doc = {
            "user_id": user_id,
            "interests": [],
            "preferences": {},
            "locations": [],
            "activity_times": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def update(self, user_id: str, updates: Dict[str, Any]) -> Optional[dict]:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"user_id": user_id}, {"$set": updates}, upsert=True
        )
        return await self.get_by_user_id(user_id)

    async def add_interest(self, user_id: str, interest: str) -> Optional[dict]:
        await self.collection.update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"interests": interest},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        return await self.get_by_user_id(user_id)

    async def add_location(self, user_id: str, location: str) -> Optional[dict]:
        await self.collection.update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"locations": location},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        return await self.get_by_user_id(user_id)

    async def get_all_locations(self, user_id: str) -> List[str]:
        profile = await self.get_by_user_id(user_id)
        if profile:
            return profile.get("locations", [])
        return []
