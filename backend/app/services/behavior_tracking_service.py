import logging
from typing import Any, Dict, List

import motor.motor_asyncio

from app.repositories.behavior_repository import BehaviorRepository

logger = logging.getLogger(__name__)


class BehaviorTrackingService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._repo = BehaviorRepository(db)

    async def track_event(
        self, user_id: str, event_type: str, data: Dict[str, Any]
    ) -> dict:
        return await self._repo.create(user_id, event_type, data)

    async def get_user_behavior(
        self, user_id: str, event_type: str = None, limit: int = 100
    ) -> List[dict]:
        return await self._repo.list_by_user(user_id, event_type=event_type, limit=limit)

    async def analyze_patterns(self, user_id: str) -> Dict[str, Any]:
        counts = await self._repo.count_by_event_type(user_id)
        recent = await self._repo.list_by_user(user_id, limit=50)

        total = sum(counts.values())
        dominant_event = max(counts, key=counts.get) if counts else None

        topics: Dict[str, int] = {}
        for event in recent:
            topic = event.get("data", {}).get("topic")
            if topic:
                topics[topic] = topics.get(topic, 0) + 1

        return {
            "total_events": total,
            "event_counts": counts,
            "dominant_event": dominant_event,
            "top_topics": sorted(topics.items(), key=lambda x: x[1], reverse=True)[:5],
        }
