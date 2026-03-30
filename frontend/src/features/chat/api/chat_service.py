from __future__ import annotations


def build_chat_payload(message: str) -> dict[str, str]:
    cleaned_message = message.strip()
    return {"message": cleaned_message}
