from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional


class InputSanitizer:
    """Sanitizes raw user input before it is passed to the LLM pipeline."""

    _CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

    @classmethod
    def sanitize(cls, text: str) -> str:
        """Remove null bytes and non-printable ASCII control characters (preserves \\t, \\n, \\r)."""
        return cls._CONTROL_CHAR_RE.sub("", text)


class ApiErrorCategorizer:
    """Maps caught exceptions to structured log event names for consistent observability."""

    @classmethod
    def categorize(cls, exc: Exception) -> str:
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


class LLMResponseParser:
    """Parses and normalizes LLM response text (JSON extraction, code fence stripping)."""

    @staticmethod
    def strip_code_fence(raw: str) -> str:
        """Remove markdown code fences that LLMs sometimes wrap JSON in."""
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
        return raw

    @classmethod
    def parse_json(cls, raw: str) -> dict[str, Any]:
        """Strip code fences then parse JSON from an LLM response string."""
        result: dict[str, Any] = json.loads(cls.strip_code_fence(raw.strip()))
        return result


class GuardLogger:
    """Emits structured guardrail log lines without including user message content."""

    _logger = logging.getLogger(__name__)

    @classmethod
    def log(cls, guard: str, session_id: str, event: str, reason: Optional[str] = None) -> None:
        """Log a guardrail event. Only session_id, event type, reason, and timestamp are logged."""
        cls._logger.warning(
            "guardrail.%s session_id=%s event=%s reason=%s ts=%s",
            guard,
            session_id,
            event,
            reason or "",
            datetime.now(timezone.utc).isoformat(),
        )
