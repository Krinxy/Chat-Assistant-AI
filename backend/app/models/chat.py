from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str
    user_id: str
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}


class ChatSession(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    title: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

    model_config = {"populate_by_name": True}
