from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from ...dependency.llm import LLMClient
from .prompts import GUARD_PROMPTS


class GuardStatus(str, Enum):
    PASSED = "passed"
    REJECTED = "rejected"
    UNAVAILABLE = "unavailable"


@dataclass
class GuardOutcome:
    status: GuardStatus
    reason: Optional[str] = None


class PromptLoader:
    """Returns compiled system prompt strings from the in-code Pydantic registry."""

    @staticmethod
    def load(name: str) -> str:
        """Return the system prompt for a named guard (input_guard, query_refiner, output_guard)."""
        prompt = getattr(GUARD_PROMPTS, name, None)
        if prompt is None:
            raise ValueError(f"Unknown guard prompt name: {name!r}")
        return str(prompt.system)


class LLMClientFactory:
    """Constructs LLMClient instances from config dicts."""

    @staticmethod
    def from_config(config: dict[str, Any]) -> LLMClient:
        return LLMClient.from_config(config)
