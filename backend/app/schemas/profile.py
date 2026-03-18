from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    interests: Optional[List[str]] = None
    preferences: Optional[Dict[str, Any]] = None
    locations: Optional[List[str]] = None
    activity_times: Optional[Dict[str, Any]] = None


class ProfileResponse(BaseModel):
    user_id: str
    interests: List[str]
    preferences: Dict[str, Any]
    locations: List[str]
    activity_times: Dict[str, Any]
    updated_at: Optional[datetime] = None
