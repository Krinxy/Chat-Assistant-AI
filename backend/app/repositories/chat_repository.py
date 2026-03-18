from datetime import datetime, timezone
from typing import List, Optional

import motor.motor_asyncio
from bson import ObjectId


class ChatRepository:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self.sessions = db["chat_sessions"]
        self.messages = db["chat_messages"]

    # --- Sessions ---

    async def create_session(self, user_id: str, title: Optional[str] = None) -> dict:
        doc = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "is_active": True,
        }
        result = await self.sessions.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def get_session(self, session_id: str) -> Optional[dict]:
        doc = await self.sessions.find_one({"_id": ObjectId(session_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def list_sessions(self, user_id: str) -> List[dict]:
        cursor = self.sessions.find({"user_id": user_id}).sort("updated_at", -1)
        sessions = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            sessions.append(doc)
        return sessions

    async def update_session(self, session_id: str, updates: dict) -> Optional[dict]:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.sessions.update_one(
            {"_id": ObjectId(session_id)}, {"$set": updates}
        )
        return await self.get_session(session_id)

    # --- Messages ---

    async def add_message(
        self, session_id: str, user_id: str, role: str, content: str
    ) -> dict:
        doc = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.messages.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        await self.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"updated_at": datetime.now(timezone.utc)}},
        )
        return doc

    async def get_messages(self, session_id: str) -> List[dict]:
        cursor = self.messages.find({"session_id": session_id}).sort("created_at", 1)
        messages = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            messages.append(doc)
        return messages

    async def delete_session(self, session_id: str) -> bool:
        await self.messages.delete_many({"session_id": session_id})
        result = await self.sessions.delete_one({"_id": ObjectId(session_id)})
        return result.deleted_count > 0
