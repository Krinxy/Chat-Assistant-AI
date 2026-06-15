from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Optional

from ...dependency.llm import LLMClient

_PROMPTS_DIR = Path(__file__).parent / "prompts"


class GuardStatus(str, Enum):
    PASSED = "passed"
    REJECTED = "rejected"
    UNAVAILABLE = "unavailable"


@dataclass
class GuardOutcome:
    status: GuardStatus
    reason: Optional[str] = None


def load_prompt(filename: str) -> str:
    """Load a prompt template from the guardrails/prompts directory.

    Guards against path traversal: filename must resolve inside _PROMPTS_DIR.
    """
    resolved = (_PROMPTS_DIR / filename).resolve()
    if not resolved.is_relative_to(_PROMPTS_DIR.resolve()):
        raise ValueError(f"Prompt file outside allowed directory: {filename!r}")
    return resolved.read_text(encoding="utf-8").strip()


def build_llm_client(config: dict[str, Any]) -> LLMClient:
    """Build an LLMClient from a config dict with 'model' and 'temperature' keys."""
    return LLMClient.from_config(config)
