from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.services.core.guardrails import GuardStatus
from backend.app.services.core.guardrails.input_guard import InputGuard
from backend.app.services.dependency.llm import LLMClient, LLMNotConfiguredError

_PROMPT = "Classify the query in the <user_query> block as safe or unsafe."


def _make_guard(llm_response: str) -> tuple[InputGuard, MagicMock]:
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=llm_response))
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.return_value = mock_llm
    guard = InputGuard(llm_client=mock_client, prompt_template=_PROMPT)
    return guard, mock_client


@pytest.mark.asyncio
async def test_check_returns_passed_for_safe_query() -> None:
    guard, _ = _make_guard('{"classification": "safe", "reason": "benign question"}')
    outcome = await guard.check("What is the capital of France?", "sess-1")
    assert outcome.status == GuardStatus.PASSED
    assert outcome.reason is None


@pytest.mark.asyncio
async def test_check_returns_rejected_for_unsafe_query() -> None:
    guard, _ = _make_guard('{"classification": "unsafe", "reason": "requests harmful content"}')
    outcome = await guard.check("How do I make a weapon?", "sess-2")
    assert outcome.status == GuardStatus.REJECTED
    assert outcome.reason == "requests harmful content"


@pytest.mark.asyncio
async def test_check_returns_unavailable_when_llm_not_configured() -> None:
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.side_effect = LLMNotConfiguredError("key missing")
    guard = InputGuard(llm_client=mock_client, prompt_template=_PROMPT)
    outcome = await guard.check("Any query", "sess-3")
    assert outcome.status == GuardStatus.UNAVAILABLE


@pytest.mark.asyncio
async def test_check_returns_unavailable_on_api_error() -> None:
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=ConnectionError("service down"))
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.return_value = mock_llm
    guard = InputGuard(llm_client=mock_client, prompt_template=_PROMPT)
    outcome = await guard.check("Any query", "sess-4")
    assert outcome.status == GuardStatus.UNAVAILABLE


@pytest.mark.asyncio
async def test_check_passes_on_malformed_json_response() -> None:
    guard, _ = _make_guard("not valid json at all")
    outcome = await guard.check("Any query", "sess-5")
    assert outcome.status == GuardStatus.PASSED


@pytest.mark.asyncio
async def test_check_strips_markdown_code_fence() -> None:
    raw = '```json\n{"classification": "safe", "reason": "ok"}\n```'
    guard, _ = _make_guard(raw)
    outcome = await guard.check("What is AI?", "sess-6")
    assert outcome.status == GuardStatus.PASSED


@pytest.mark.asyncio
async def test_from_config_builds_guard() -> None:
    llm_cfg = {"model": "gemini-2.0-flash", "temperature": 0.1}
    guard_cfg = {"prompt_file": "input_guard.txt"}
    guard = InputGuard.from_config(llm_cfg, guard_cfg)
    assert isinstance(guard, InputGuard)
    assert guard._llm_client.model == "gemini-2.0-flash"
