from __future__ import annotations

import json
from typing import Any, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from ...dependency.llm import LLMClient, LLMNotConfiguredError
from ..guardrails import GuardOutcome, GuardStatus, LLMClientFactory, PromptLoader
from .helpers import ApiErrorCategorizer, GuardLogger, InputSanitizer, LLMResponseParser


class InputGuard:
    """Classifies user queries as safe or unsafe before any retrieval or storage.

    Prompt injection mitigation: system instructions are sent as SystemMessage;
    untrusted user content is sent separately as HumanMessage wrapped in XML delimiters.
    Fail-open: returns UNAVAILABLE (not REJECTED) when the LLM API is down.
    No user data is written to logs — only session_id, event, and reason.
    """

    def __init__(self, llm_client: LLMClient, prompt_template: str) -> None:
        self._llm_client = llm_client
        self._prompt_template = prompt_template

    # ── helpers ────────────────────────────────────────────────────────────────

    def _parse(self, raw: str) -> tuple[str, str]:
        parsed = LLMResponseParser.parse_json(raw)
        return str(parsed.get("classification", "safe")).lower(), str(parsed.get("reason", ""))

    def _log(self, session_id: str, event: str, reason: Optional[str] = None) -> None:
        GuardLogger.log("input", session_id, event, reason)

    # ── main entry point ───────────────────────────────────────────────────────

    async def check(self, query: str, session_id: str) -> GuardOutcome:
        """Classify the query. Returns PASSED, REJECTED, or UNAVAILABLE."""
        try:
            llm = self._llm_client.get()
            safe_query = InputSanitizer.sanitize(query)
            response = await llm.ainvoke(
                [
                    SystemMessage(content=self._prompt_template),
                    HumanMessage(content=f"<user_query>\n{safe_query}\n</user_query>"),
                ]
            )
            raw: str = response.content if isinstance(response.content, str) else str(response.content)

            classification, reason = self._parse(raw)
            if classification == "unsafe":
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
            event = ApiErrorCategorizer.categorize(exc)
            self._log(session_id, event, type(exc).__name__)
            return GuardOutcome(status=GuardStatus.UNAVAILABLE, reason=type(exc).__name__)

    # ── factory ────────────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, llm_config: dict[str, Any], guard_config: dict[str, Any]) -> "InputGuard":
        llm_client = LLMClientFactory.from_config(llm_config)
        prompt = PromptLoader.load("input_guard")
        return cls(llm_client=llm_client, prompt_template=prompt)
