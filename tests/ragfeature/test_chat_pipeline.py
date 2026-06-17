from __future__ import annotations

from types import SimpleNamespace
from typing import Any, AsyncIterator, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.api.chat import ChatPipeline
from backend.app.services.core.guardrails import GuardOutcome, GuardStatus
from backend.app.services.dependency.llm import LLMClient, LLMNotConfiguredError


async def _aiter(items: list[Any]) -> AsyncIterator[Any]:
    for item in items:
        yield item


def _make_pipeline(
    *,
    chat_llm: Optional[MagicMock] = None,
    input_status: GuardStatus = GuardStatus.PASSED,
    output_status: GuardStatus = GuardStatus.PASSED,
) -> ChatPipeline:
    input_guard = MagicMock()
    input_guard.check = AsyncMock(return_value=GuardOutcome(status=input_status))
    query_refiner = MagicMock()
    query_refiner.refine = AsyncMock(side_effect=lambda q, s: q)
    output_guard = MagicMock()
    output_guard.check = AsyncMock(return_value=GuardOutcome(status=output_status))
    policy_guard = MagicMock()
    policy_guard.check_local = MagicMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    return ChatPipeline(
        input_guard=input_guard,
        query_refiner=query_refiner,
        output_guard=output_guard,
        policy_guard=policy_guard,
        chat_llm=chat_llm or MagicMock(spec=LLMClient),
        system_prompt="You are a test assistant.",
        output_rejected_msg="REPLACED",
    )


def _chat_llm_returning(llm: MagicMock) -> MagicMock:
    chat_llm = MagicMock(spec=LLMClient)
    chat_llm.get.return_value = llm
    return chat_llm


@pytest.mark.asyncio
async def test_generate_strips_think_blocks() -> None:
    llm = MagicMock()
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content="<think>secret reasoning</think>Final answer."))
    pipeline = _make_pipeline(chat_llm=_chat_llm_returning(llm))

    assert await pipeline._generate("hi", "") == "Final answer."


@pytest.mark.asyncio
async def test_run_stream_yields_deltas_then_done() -> None:
    llm = MagicMock()
    chunks = [SimpleNamespace(content="Hel"), SimpleNamespace(content="lo"), SimpleNamespace(content=None)]
    llm.astream = MagicMock(return_value=_aiter(chunks))
    pipeline = _make_pipeline(chat_llm=_chat_llm_returning(llm))

    events = [ev async for ev in pipeline.run_stream("hi", "sess")]

    assert "".join(e.text for e in events if e.kind == "delta") == "Hello"
    done = [e for e in events if e.kind == "done"]
    assert len(done) == 1
    assert done[0].status == "ok"
    assert done[0].text == "Hello"


@pytest.mark.asyncio
async def test_run_stream_strips_reasoning_from_stream() -> None:
    llm = MagicMock()
    chunks = [SimpleNamespace(content="<think>plan</think>"), SimpleNamespace(content="Answer")]
    llm.astream = MagicMock(return_value=_aiter(chunks))
    pipeline = _make_pipeline(chat_llm=_chat_llm_returning(llm))

    events = [ev async for ev in pipeline.run_stream("hi", "sess")]

    assert "".join(e.text for e in events if e.kind == "delta") == "Answer"


@pytest.mark.asyncio
async def test_run_stream_output_guard_rejection_replaces_message() -> None:
    llm = MagicMock()
    llm.astream = MagicMock(return_value=_aiter([SimpleNamespace(content="bad answer")]))
    pipeline = _make_pipeline(chat_llm=_chat_llm_returning(llm), output_status=GuardStatus.REJECTED)

    events = [ev async for ev in pipeline.run_stream("hi", "sess")]
    done = next(e for e in events if e.kind == "done")

    assert done.status == "output_rejected"
    assert done.text == "REPLACED"


@pytest.mark.asyncio
async def test_run_stream_emits_error_when_llm_unconfigured() -> None:
    chat_llm = MagicMock(spec=LLMClient)
    chat_llm.get.side_effect = LLMNotConfiguredError("no creds")
    pipeline = _make_pipeline(chat_llm=chat_llm)

    events = [ev async for ev in pipeline.run_stream("hi", "sess")]

    assert len(events) == 1
    assert events[0].kind == "error"
    assert events[0].status == "llm_unavailable"


@pytest.mark.asyncio
async def test_screen_input_returns_true_on_rejection() -> None:
    pipeline = _make_pipeline(input_status=GuardStatus.REJECTED)
    assert await pipeline.screen_input("bad", "sess") is True


@pytest.mark.asyncio
async def test_screen_input_returns_false_on_pass() -> None:
    pipeline = _make_pipeline(input_status=GuardStatus.PASSED)
    assert await pipeline.screen_input("ok", "sess") is False
