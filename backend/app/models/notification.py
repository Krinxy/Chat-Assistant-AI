from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class Notification(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    title: str
    message: str
    notification_type: str = "info"  # info | warning | success | error
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
