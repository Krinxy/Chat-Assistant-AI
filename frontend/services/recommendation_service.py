from typing import Optional
from services.api_client import get


def get_recommendations() -> Optional[dict]:
    return get("/recommendations")
