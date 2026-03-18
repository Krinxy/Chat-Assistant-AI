from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = NotificationService(db)
    notifications = await service.get_notifications(
        str(current_user["_id"]), unread_only=unread_only
    )
    return [
        NotificationResponse(
            id=str(n["_id"]),
            user_id=n["user_id"],
            title=n["title"],
            message=n["message"],
            notification_type=n["notification_type"],
            is_read=n["is_read"],
            created_at=n.get("created_at"),
        )
        for n in notifications
    ]


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = NotificationService(db)
    notification = await service.mark_read(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationResponse(
        id=str(notification["_id"]),
        user_id=notification["user_id"],
        title=notification["title"],
        message=notification["message"],
        notification_type=notification["notification_type"],
        is_read=notification["is_read"],
        created_at=notification.get("created_at"),
    )
