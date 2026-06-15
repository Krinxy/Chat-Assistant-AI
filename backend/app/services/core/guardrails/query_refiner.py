from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from ...dependency.llm import LLMClient, LLMNotConfiguredError
from ..guardrails import build_llm_client, load_prompt
from .helpers import categorize_api_error, log_guard_event, sanitize_user_input


class QueryRefiner:
    """Rewrites user queries for better semantic retrieval.

    Prompt injection mitigation: system instructions are sent as SystemMessage;
    untrusted user content is sent separately as HumanMessage wrapped in XML delimiters.
    Fail-open: returns the original query if the LLM API is unavailable.
    """

    def __init__(self, llm_client: LLMClient, prompt_template: str) -> None:
        self._llm_client = llm_client
        self._prompt_template = prompt_template

    # ── helpers ────────────────────────────────────────────────────────────────

    def _log(self, session_id: str, event: str) -> None:
        log_guard_event("query_refiner", session_id, event, None)

    # ── main entry point ───────────────────────────────────────────────────────

    async def refine(self, query: str, session_id: str) -> str:
        """Return a refined query, or the original on API failure."""
        try:
            llm = self._llm_client.get()
            safe_query = sanitize_user_input(query)
            response = await llm.ainvoke(
                [
                    SystemMessage(content=self._prompt_template),
                    HumanMessage(content=f"<user_query>\n{safe_query}\n</user_query>"),
                ]
            )
            refined: str = response.content if isinstance(response.content, str) else str(response.content)
            refined = refined.strip()

            if not refined:
                return query

            self._log(session_id, "refined")
            return refined

        except LLMNotConfiguredError:
            self._log(session_id, "api_unavailable_passthrough")
            return query

        except Exception as exc:
            event = categorize_api_error(exc)
            log_guard_event("query_refiner", session_id, event, type(exc).__name__)
            return query

    # ── factory ────────────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, llm_config: dict[str, Any], guard_config: dict[str, Any]) -> "QueryRefiner":
        llm_client = build_llm_client(llm_config)
        prompt = load_prompt(guard_config.get("prompt_file", "query_refiner.txt"))
        return cls(llm_client=llm_client, prompt_template=prompt)
