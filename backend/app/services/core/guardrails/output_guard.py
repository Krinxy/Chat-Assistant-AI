from __future__ import annotations

import json
from typing import Any, Optional

from langchain_core.messages import HumanMessage

from ...dependency.llm import LLMClient, LLMNotConfiguredError
from ..guardrails import GuardOutcome, GuardStatus, build_llm_client, load_prompt
from .helpers import log_guard_event, parse_json_response


class OutputGuard:
    """Blocking plausibility check on the generated response.

    Fail-open: returns UNAVAILABLE (not REJECTED) when the LLM API is down.
    No user data or document chunks are written to logs.
    """

    def __init__(self, llm_client: LLMClient, prompt_template: str) -> None:
        self._llm_client = llm_client
        self._prompt_template = prompt_template

    # ── helpers ────────────────────────────────────────────────────────────────

    def _build_prompt(self, query: str, response: str) -> str:
        return self._prompt_template.format(query=query, response=response)

    def _parse(self, raw: str) -> tuple[bool, str]:
        parsed = parse_json_response(raw)
        return bool(parsed.get("plausible", True)), str(parsed.get("reason", ""))

    def _log(self, session_id: str, event: str, reason: Optional[str] = None) -> None:
        log_guard_event("output", session_id, event, reason)

    # ── main entry point ───────────────────────────────────────────────────────

    async def check(self, query: str, response: str, session_id: str) -> GuardOutcome:
        """Blocking check on the response. Returns PASSED, REJECTED, or UNAVAILABLE."""
        try:
            llm = self._llm_client.get()
            result = await llm.ainvoke([HumanMessage(content=self._build_prompt(query, response))])
            raw: str = result.content if isinstance(result.content, str) else str(result.content)

            plausible, reason = self._parse(raw)
            if not plausible:
                self._log(session_id, "rejected", reason)
                return GuardOutcome(status=GuardStatus.REJECTED, reason=reason)

            return GuardOutcome(status=GuardStatus.PASSED)

        except LLMNotConfiguredError:
            self._log(session_id, "api_unavailable", "GEMINI_API_KEY not set")
            return GuardOutcome(status=GuardStatus.UNAVAILABLE, reason="LLM not configured")

        except (json.JSONDecodeError, KeyError, ValueError):
            self._log(session_id, "parse_error_passthrough")
            return GuardOutcome(status=GuardStatus.PASSED)

        except Exception as exc:
            self._log(session_id, "api_unavailable", type(exc).__name__)
            return GuardOutcome(status=GuardStatus.UNAVAILABLE, reason=type(exc).__name__)

    # ── factory ────────────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, llm_config: dict[str, Any], guard_config: dict[str, Any]) -> "OutputGuard":
        llm_client = build_llm_client(llm_config)
        prompt = load_prompt(guard_config.get("prompt_file", "output_guard.txt"))
        return cls(llm_client=llm_client, prompt_template=prompt)
