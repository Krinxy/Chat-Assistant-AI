from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class RecommendationItem(BaseModel):
    id: str
    title: str
    description: str
    category: str
    score: float
    metadata: Optional[Dict[str, Any]] = None


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[RecommendationItem]
