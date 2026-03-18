from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MessageSchema(BaseModel):
    role: str
    content: str
    created_at: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str
    role: str = "assistant"
