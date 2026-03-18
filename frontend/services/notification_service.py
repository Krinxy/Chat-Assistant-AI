from typing import List, Optional
from services.api_client import get, put


def get_notifications(unread_only: bool = False) -> List[dict]:
    result = get("/notifications", params={"unread_only": str(unread_only).lower()})
    return result or []


def mark_read(notification_id: str) -> Optional[dict]:
    return put(f"/notifications/{notification_id}/read")
