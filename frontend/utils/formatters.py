from datetime import datetime
from typing import Optional


def format_datetime_str(dt_str: Optional[str], fmt: str = "%b %d, %Y %H:%M") -> str:
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime(fmt)
    except (ValueError, AttributeError):
        return dt_str


def truncate(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


def score_to_percentage(score: float) -> str:
    return f"{min(score * 100, 100):.0f}%"
