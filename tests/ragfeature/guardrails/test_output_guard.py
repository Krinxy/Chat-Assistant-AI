from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.services.core.guardrails import GuardStatus
from backend.app.services.core.guardrails.output_guard import OutputGuard
from backend.app.services.dependency.llm import LLMClient, LLMNotConfiguredError

_PROMPT = "Check the response in the <ai_response> block for plausibility given the <user_query>."


def _make_guard(llm_response: str) -> OutputGuard:
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=llm_response))
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.return_value = mock_llm
    return OutputGuard(llm_client=mock_client, prompt_template=_PROMPT)


@pytest.mark.asyncio
async def test_check_passes_plausible_response() -> None:
    guard = _make_guard('{"plausible": true, "reason": "well-formed answer"}')
    outcome = await guard.check("What is RAG?", "RAG stands for Retrieval-Augmented Generation.", "sess-1")
    assert outcome.status == GuardStatus.PASSED


@pytest.mark.asyncio
async def test_check_rejects_implausible_response() -> None:
    guard = _make_guard('{"plausible": false, "reason": "contains harmful instructions"}')
    outcome = await guard.check("How do I get rich?", "Steal from your employer.", "sess-2")
    assert outcome.status == GuardStatus.REJECTED
    assert outcome.reason == "contains harmful instructions"


@pytest.mark.asyncio
async def test_check_unavailable_when_llm_not_configured() -> None:
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.side_effect = LLMNotConfiguredError("key missing")
    guard = OutputGuard(llm_client=mock_client, prompt_template=_PROMPT)
    outcome = await guard.check("query", "response", "sess-3")
    assert outcome.status == GuardStatus.UNAVAILABLE


@pytest.mark.asyncio
async def test_check_unavailable_on_api_error() -> None:
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=OSError("network error"))
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.return_value = mock_llm
    guard = OutputGuard(llm_client=mock_client, prompt_template=_PROMPT)
    outcome = await guard.check("query", "response", "sess-4")
    assert outcome.status == GuardStatus.UNAVAILABLE


@pytest.mark.asyncio
async def test_check_passes_on_malformed_json() -> None:
    guard = _make_guard("this is not json")
    outcome = await guard.check("query", "response", "sess-5")
    assert outcome.status == GuardStatus.PASSED


@pytest.mark.asyncio
async def test_check_strips_markdown_code_fence() -> None:
    raw = '```json\n{"plausible": true, "reason": "ok"}\n```'
    guard = _make_guard(raw)
    outcome = await guard.check("What is AI?", "AI is artificial intelligence.", "sess-6")
    assert outcome.status == GuardStatus.PASSED


@pytest.mark.asyncio
async def test_from_config_builds_guard() -> None:
    llm_cfg = {"model": "Qwen3.5-397B-A17B_No_Thinking", "temperature": 0.1}
    guard = OutputGuard.from_config(llm_cfg, {})
    assert isinstance(guard, OutputGuard)
