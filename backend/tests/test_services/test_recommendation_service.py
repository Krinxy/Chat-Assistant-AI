import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.recommendation_service import RecommendationService


@pytest.mark.asyncio
async def test_generate_recommendations_returns_list():
    db = MagicMock()
    service = RecommendationService(db)

    with patch.object(
        service._profile_repo,
        "get_by_user_id",
        new_callable=AsyncMock,
        return_value={"user_id": "u1", "interests": ["technology"], "preferences": {}},
    ), patch.object(
        service._behavior_repo,
        "count_by_event_type",
        new_callable=AsyncMock,
        return_value={"chat_message": 10},
    ):
        recs = await service.generate_recommendations("u1")

    assert isinstance(recs, list)
    assert len(recs) <= 10
    for rec in recs:
        assert "title" in rec
        assert "score" in rec


def test_candidate_generation_includes_interest_boost():
    db = MagicMock()
    service = RecommendationService(db)
    profile = {"interests": ["technology"], "preferences": {}}
    behavior = {}
    candidates = service._candidate_generation(profile, behavior)
    tech_candidates = [c for c in candidates if c["category"] == "technology"]
    other_candidates = [c for c in candidates if c["category"] != "technology"]
    assert all(c["score"] > 0.5 for c in tech_candidates)
    assert all(c["score"] == 0.5 for c in other_candidates)
