from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class BehaviorEventCreate(BaseModel):
    event_type: str
    data: Dict[str, Any] = {}


class BehaviorEventResponse(BaseModel):
    id: str
    user_id: str
    event_type: str
    data: Dict[str, Any]
    timestamp: Optional[datetime] = None
