import logging
from typing import Any, Dict, List

import motor.motor_asyncio

from app.repositories.profile_repository import ProfileRepository
from app.repositories.behavior_repository import BehaviorRepository
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)


class RecommendationPipeline:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._profile_repo = ProfileRepository(db)
        self._behavior_repo = BehaviorRepository(db)
        self._rec_service = RecommendationService(db)

    async def run(self, user_id: str) -> List[Dict[str, Any]]:
        # Step 1: load profile
        profile = await self._profile_repo.get_by_user_id(user_id) or {}
        # Step 2: load behavior
        behavior = await self._behavior_repo.count_by_event_type(user_id)
        # Step 3: generate candidates
        candidates = self._rec_service._candidate_generation(profile, behavior)
        # Step 4: filter
        filtered = self._rec_service._filter_candidates(candidates, profile)
        # Step 5: rank
        ranked = self._rec_service._rank_candidates(filtered, profile, behavior)
        # Step 6: rerank (top 10)
        return ranked[:10]
