from fastapi import APIRouter, Depends
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.schemas.profile import ProfileUpdate, ProfileResponse
from app.services.user_profile_service import UserProfileService

router = APIRouter()


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = UserProfileService(db)
    profile = await service.get_profile(str(current_user["_id"]))
    return ProfileResponse(
        user_id=profile["user_id"],
        interests=profile.get("interests", []),
        preferences=profile.get("preferences", {}),
        locations=profile.get("locations", []),
        activity_times=profile.get("activity_times", {}),
        updated_at=profile.get("updated_at"),
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = UserProfileService(db)
    updates = payload.model_dump(exclude_none=True)
    profile = await service.update_profile(str(current_user["_id"]), updates)
    return ProfileResponse(
        user_id=profile["user_id"],
        interests=profile.get("interests", []),
        preferences=profile.get("preferences", {}),
        locations=profile.get("locations", []),
        activity_times=profile.get("activity_times", {}),
        updated_at=profile.get("updated_at"),
    )
