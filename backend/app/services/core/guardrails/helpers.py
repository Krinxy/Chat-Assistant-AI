from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)


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
