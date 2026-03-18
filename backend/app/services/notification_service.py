import logging
from typing import List, Optional

import motor.motor_asyncio

from app.repositories.notification_repository import NotificationRepository
from app.repositories.behavior_repository import BehaviorRepository

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._repo = NotificationRepository(db)
        self._behavior_repo = BehaviorRepository(db)

    async def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
    ) -> dict:
        return await self._repo.create(user_id, title, message, notification_type)

    async def get_notifications(
        self, user_id: str, unread_only: bool = False
    ) -> List[dict]:
        return await self._repo.list_by_user(user_id, unread_only=unread_only)

    async def mark_read(self, notification_id: str) -> Optional[dict]:
        return await self._repo.mark_read(notification_id)

    async def generate_smart_notifications(self, user_id: str) -> List[dict]:
        counts = await self._behavior_repo.count_by_event_type(user_id)
        created = []

        total = sum(counts.values())
        if total > 100:
            n = await self._repo.create(
                user_id,
                "High Engagement!",
                f"You've had {total} interactions. Keep it up!",
                "success",
            )
            created.append(n)

        if counts.get("chat_message", 0) > 50:
            n = await self._repo.create(
                user_id,
                "Chat Milestone",
                "You've sent over 50 chat messages. Check your recommendations!",
                "info",
            )
            created.append(n)

        return created
