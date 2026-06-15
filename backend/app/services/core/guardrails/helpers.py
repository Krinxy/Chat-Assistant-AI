from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Strips null bytes and non-printable ASCII control characters (excludes \t, \n, \r).
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_user_input(text: str) -> str:
    """Remove null bytes and dangerous control characters from user-supplied text."""
    return _CONTROL_CHAR_RE.sub("", text)


def categorize_api_error(exc: Exception) -> str:
    """Map a caught exception to a structured log event name."""
    exc_type = type(exc).__name__.lower()
    exc_str = str(exc).lower()
    if "resourceexhausted" in exc_type or "quota" in exc_str or "429" in exc_str:
        return "quota_exceeded"
    if "deadlineexceeded" in exc_type or "timeout" in exc_type or "timed out" in exc_str:
        return "timeout"
    if "unauthenticated" in exc_type or "permissiondenied" in exc_type or "403" in exc_str or "401" in exc_str:
        return "auth_error"
    if "serviceunavailable" in exc_type or "connection" in exc_type or "network" in exc_str:
        return "network_error"
    return "api_error"


def strip_code_fence(raw: str) -> str:
    """Remove markdown code fences that LLMs sometimes wrap JSON in."""
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
    return raw


def parse_json_response(raw: str) -> dict[str, Any]:
    """Strip code fences and parse JSON from an LLM response string."""
    result: dict[str, Any] = json.loads(strip_code_fence(raw.strip()))
    return result


def log_guard_event(guard: str, session_id: str, event: str, reason: Optional[str]) -> None:
    """Emit a structured guardrail log line.

    Only session_id, event type, reason, and timestamp are logged.
    User message content and document chunks are never included.
    """
    logger.warning(
        "guardrail.%s session_id=%s event=%s reason=%s ts=%s",
        guard,
        session_id,
        event,
        reason or "",
        datetime.now(timezone.utc).isoformat(),
    )
