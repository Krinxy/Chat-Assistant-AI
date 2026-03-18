from fastapi import APIRouter, Depends
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.schemas.recommendation import RecommendationResponse, RecommendationItem
from app.services.recommendation_service import RecommendationService

router = APIRouter()


@router.get("", response_model=RecommendationResponse)
async def get_recommendations(
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = RecommendationService(db)
    user_id = str(current_user["_id"])
    recs = await service.generate_recommendations(user_id)
    return RecommendationResponse(
        user_id=user_id,
        recommendations=[RecommendationItem(**r) for r in recs],
    )
