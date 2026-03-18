from typing import Any, Dict, Optional
from services.api_client import get, put


def get_profile() -> Optional[dict]:
    return get("/profile")


def update_profile(updates: Dict[str, Any]) -> Optional[dict]:
    return put("/profile", json=updates)
