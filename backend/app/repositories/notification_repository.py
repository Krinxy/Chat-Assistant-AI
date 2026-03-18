from datetime import datetime, timezone
from typing import List, Optional

import motor.motor_asyncio
from bson import ObjectId


class NotificationRepository:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self.collection = db["notifications"]

    async def create(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
    ) -> dict:
        doc = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def get_by_id(self, notification_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"_id": ObjectId(notification_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def list_by_user(
        self, user_id: str, unread_only: bool = False
    ) -> List[dict]:
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        cursor = self.collection.find(query).sort("created_at", -1)
        notifications = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            notifications.append(doc)
        return notifications

    async def mark_read(self, notification_id: str) -> Optional[dict]:
        await self.collection.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"is_read": True}},
        )
        return await self.get_by_id(notification_id)

    async def mark_all_read(self, user_id: str) -> int:
        result = await self.collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}},
        )
        return result.modified_count

    async def delete(self, notification_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(notification_id)})
        return result.deleted_count > 0
