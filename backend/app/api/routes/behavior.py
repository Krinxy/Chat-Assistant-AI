from typing import List

from fastapi import APIRouter, Depends, status
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.schemas.behavior import BehaviorEventCreate, BehaviorEventResponse
from app.services.behavior_tracking_service import BehaviorTrackingService

router = APIRouter()


@router.post("/event", response_model=BehaviorEventResponse, status_code=status.HTTP_201_CREATED)
async def track_event(
    payload: BehaviorEventCreate,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = BehaviorTrackingService(db)
    event = await service.track_event(
        user_id=str(current_user["_id"]),
        event_type=payload.event_type,
        data=payload.data,
    )
    return BehaviorEventResponse(
        id=str(event["_id"]),
        user_id=event["user_id"],
        event_type=event["event_type"],
        data=event["data"],
        timestamp=event.get("timestamp"),
    )


@router.get("/events", response_model=List[BehaviorEventResponse])
async def get_events(
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = BehaviorTrackingService(db)
    events = await service.get_user_behavior(str(current_user["_id"]))
    return [
        BehaviorEventResponse(
            id=str(e["_id"]),
            user_id=e["user_id"],
            event_type=e["event_type"],
            data=e["data"],
            timestamp=e.get("timestamp"),
        )
        for e in events
    ]
