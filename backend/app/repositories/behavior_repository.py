from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import motor.motor_asyncio
from bson import ObjectId


class BehaviorRepository:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self.collection = db["behavior_events"]

    async def create(self, user_id: str, event_type: str, data: Dict[str, Any]) -> dict:
        doc = {
            "user_id": user_id,
            "event_type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc),
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def get_by_id(self, event_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"_id": ObjectId(event_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def list_by_user(
        self,
        user_id: str,
        event_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        query: Dict[str, Any] = {"user_id": user_id}
        if event_type:
            query["event_type"] = event_type
        cursor = self.collection.find(query).sort("timestamp", -1).limit(limit)
        events = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            events.append(doc)
        return events

    async def count_by_event_type(self, user_id: str) -> Dict[str, int]:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        ]
        counts: Dict[str, int] = {}
        async for doc in self.collection.aggregate(pipeline):
            counts[doc["_id"]] = doc["count"]
        return counts

    async def delete_by_user(self, user_id: str) -> int:
        result = await self.collection.delete_many({"user_id": user_id})
        return result.deleted_count
