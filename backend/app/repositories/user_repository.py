from datetime import datetime, timezone
from typing import Optional

import motor.motor_asyncio
from bson import ObjectId

from app.core.security import get_password_hash


class UserRepository:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self.collection = db["users"]

    async def create(self, email: str, username: str, password: str) -> dict:
        doc = {
            "email": email,
            "username": username,
            "hashed_password": get_password_hash(password),
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def get_by_id(self, user_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"_id": ObjectId(user_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_by_email(self, email: str) -> Optional[dict]:
        doc = await self.collection.find_one({"email": email})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_by_username(self, username: str) -> Optional[dict]:
        doc = await self.collection.find_one({"username": username})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def update(self, user_id: str, updates: dict) -> Optional[dict]:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": updates}
        )
        return await self.get_by_id(user_id)

    async def delete(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0
