import logging
import uuid
from typing import Any, Dict, List

import motor.motor_asyncio

from app.repositories.profile_repository import ProfileRepository
from app.repositories.behavior_repository import BehaviorRepository

logger = logging.getLogger(__name__)

_CATEGORY_TOPICS: Dict[str, List[str]] = {
    "technology": ["AI", "programming", "gadgets", "software", "cloud"],
    "health": ["fitness", "nutrition", "wellness", "mental health"],
    "entertainment": ["movies", "music", "gaming", "books"],
    "travel": ["destinations", "tips", "culture", "food"],
    "finance": ["investing", "budgeting", "crypto", "real estate"],
}


class RecommendationService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._profile_repo = ProfileRepository(db)
        self._behavior_repo = BehaviorRepository(db)

    async def generate_recommendations(self, user_id: str) -> List[Dict[str, Any]]:
        profile = await self._profile_repo.get_by_user_id(user_id) or {}
        behavior_counts = await self._behavior_repo.count_by_event_type(user_id)

        candidates = self._candidate_generation(profile, behavior_counts)
        candidates = self._filter_candidates(candidates, profile)
        ranked = self._rank_candidates(candidates, profile, behavior_counts)
        return ranked[:10]

    def _candidate_generation(
        self, profile: dict, behavior: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        interests = profile.get("interests", [])
        candidates = []
        for category, topics in _CATEGORY_TOPICS.items():
            for topic in topics:
                score = 0.5
                if category.lower() in [i.lower() for i in interests]:
                    score += 0.3
                candidates.append(
                    {
                        "id": str(uuid.uuid4()),
                        "title": f"{topic} Insights",
                        "description": f"Curated content about {topic} in {category}.",
                        "category": category,
                        "score": score,
                        "metadata": {"topic": topic},
                    }
                )
        return candidates

    def _filter_candidates(
        self, candidates: List[Dict[str, Any]], profile: dict
    ) -> List[Dict[str, Any]]:
        preferences = profile.get("preferences", {})
        excluded = preferences.get("excluded_categories", [])
        return [c for c in candidates if c["category"] not in excluded]

    def _rank_candidates(
        self,
        candidates: List[Dict[str, Any]],
        profile: dict,
        behavior: Dict[str, int],
    ) -> List[Dict[str, Any]]:
        chat_count = behavior.get("chat_message", 0)
        boost = min(chat_count * 0.01, 0.2)
        for c in candidates:
            c["score"] = round(c["score"] + boost, 4)
        return sorted(candidates, key=lambda x: x["score"], reverse=True)
