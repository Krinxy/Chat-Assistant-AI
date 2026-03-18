from typing import List, Optional
from services.api_client import get, post


def create_session() -> Optional[dict]:
    return post("/chat/session")


def send_message(message: str, session_id: Optional[str] = None) -> Optional[dict]:
    payload = {"message": message}
    if session_id:
        payload["session_id"] = session_id
    return post("/chat/message", json=payload)


def get_history(session_id: str) -> List[dict]:
    result = get(f"/chat/history/{session_id}")
    return result or []
