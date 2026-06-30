from __future__ import annotations

from types import SimpleNamespace
from typing import Any, AsyncIterator, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.api.chat import ChatPipeline
from backend.app.services.core.guardrails import GuardOutcome, GuardStatus
from backend.app.services.core.rag.chain import NO_CONTEXT_MESSAGE
from backend.app.services.core.rag.retriever import RetrievedChunk
from backend.app.services.dependency.llm import LLMClient


async def _aiter(items: list[Any]) -> AsyncIterator[Any]:
    for item in items:
        yield item


def _chat_llm_returning(inner: MagicMock) -> MagicMock:
    chat_llm = MagicMock(spec=LLMClient)
    chat_llm.get.return_value = inner
    return chat_llm


def _rag_pipeline(
    *,
    chat_llm: MagicMock,
    retrieved: Optional[list[RetrievedChunk]] = None,
) -> tuple[ChatPipeline, MagicMock]:
    input_guard = MagicMock()
    input_guard.check = AsyncMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    query_refiner = MagicMock()
    query_refiner.refine = AsyncMock(side_effect=lambda q, s: q)
    output_guard = MagicMock()
    output_guard.check = AsyncMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    policy_guard = MagicMock()
    policy_guard.check_local = MagicMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    retriever = MagicMock()
    retriever.retrieve = MagicMock(return_value=retrieved if retrieved is not None else [])
    pipeline = ChatPipeline(
        input_guard=input_guard,
        query_refiner=query_refiner,
        output_guard=output_guard,
        policy_guard=policy_guard,
        chat_llm=chat_llm,
        retriever=retriever,
        system_prompt="You are a test assistant.",
        output_rejected_msg="REPLACED",
    )
    return pipeline, retriever


_CHUNK = RetrievedChunk(text="Revenue was 5M.", source="doc-1", chunk_index=0, similarity=0.82)


@pytest.mark.asyncio
async def test_run_returns_answer_and_sources_from_retrieved_chunks() -> None:
    llm = MagicMock()
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content="The revenue was 5M."))
    pipeline, _ = _rag_pipeline(chat_llm=_chat_llm_returning(llm), retrieved=[_CHUNK])

    message, status, sources = await pipeline.run("revenue?", "sess")

    assert message == "The revenue was 5M."
    assert status == "ok"
    assert sources == [{"source": "doc-1", "chunk_index": 0, "similarity": 0.82}]


@pytest.mark.asyncio
async def test_run_injects_retrieved_context_into_prompt() -> None:
    llm = MagicMock()
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content="ok"))
    pipeline, _ = _rag_pipeline(chat_llm=_chat_llm_returning(llm), retrieved=[_CHUNK])

    await pipeline.run("revenue?", "sess")

    sent_messages = llm.ainvoke.call_args.args[0]
    system_content = sent_messages[0].content
    assert "Revenue was 5M." in system_content  # the chunk text is grounded into the prompt


@pytest.mark.asyncio
async def test_run_no_context_fallback_skips_llm() -> None:
    llm = MagicMock()
    llm.ainvoke = AsyncMock()
    pipeline, _ = _rag_pipeline(chat_llm=_chat_llm_returning(llm), retrieved=[])

    message, status, sources = await pipeline.run("unknown?", "sess")

    assert message == NO_CONTEXT_MESSAGE
    assert status == "no_context"
    assert sources == []
    llm.ainvoke.assert_not_called()  # no chunks → no generation call


@pytest.mark.asyncio
async def test_run_stream_done_carries_sources() -> None:
    llm = MagicMock()
    llm.astream = MagicMock(return_value=_aiter([SimpleNamespace(content="The "), SimpleNamespace(content="answer.")]))
    pipeline, _ = _rag_pipeline(chat_llm=_chat_llm_returning(llm), retrieved=[_CHUNK])

    events = [ev async for ev in pipeline.run_stream("revenue?", "sess")]

    assert "".join(e.text for e in events if e.kind == "delta") == "The answer."
    done = next(e for e in events if e.kind == "done")
    assert done.status == "ok"
    assert done.sources == [{"source": "doc-1", "chunk_index": 0, "similarity": 0.82}]


@pytest.mark.asyncio
async def test_run_stream_no_context_fallback() -> None:
    llm = MagicMock()
    llm.astream = MagicMock()
    pipeline, _ = _rag_pipeline(chat_llm=_chat_llm_returning(llm), retrieved=[])

    events = [ev async for ev in pipeline.run_stream("unknown?", "sess")]

    assert [e.kind for e in events] == ["delta", "done"]
    assert events[0].text == NO_CONTEXT_MESSAGE
    assert events[1].status == "no_context"
    assert events[1].sources == []
    llm.astream.assert_not_called()
