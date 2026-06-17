from __future__ import annotations

import os
from types import SimpleNamespace
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("JWT_SECRET", "test-secret-key-minimum-32-chars-long!")

from backend.app.api import chat as chat_api  # noqa: E402
from backend.app.api.chat import ChatPipeline  # noqa: E402
from backend.app.api.chat import initialize as initialize_chat  # noqa: E402
from backend.app.db.session import Base, get_db  # noqa: E402
from backend.app.main import create_app  # noqa: E402
from backend.app.services.core.guardrails import GuardOutcome, GuardStatus  # noqa: E402
from backend.app.services.dependency.llm import LLMClient  # noqa: E402

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db() -> AsyncIterator[Any]:
    async with _Session() as session:
        yield session


async def _aiter(items: list[Any]) -> AsyncIterator[Any]:
    for item in items:
        yield item


def _fake_pipeline(chunks: list[Any], *, output_status: GuardStatus = GuardStatus.PASSED) -> ChatPipeline:
    input_guard = MagicMock()
    input_guard.check = AsyncMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    query_refiner = MagicMock()
    query_refiner.refine = AsyncMock(side_effect=lambda q, s: q)
    output_guard = MagicMock()
    output_guard.check = AsyncMock(return_value=GuardOutcome(status=output_status))
    policy_guard = MagicMock()
    policy_guard.check_local = MagicMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    llm = MagicMock()
    llm.astream = MagicMock(return_value=_aiter(chunks))
    chat_llm = MagicMock(spec=LLMClient)
    chat_llm.get.return_value = llm
    return ChatPipeline(
        input_guard=input_guard,
        query_refiner=query_refiner,
        output_guard=output_guard,
        policy_guard=policy_guard,
        chat_llm=chat_llm,
        system_prompt="test",
        output_rejected_msg="REPLACED",
    )


@pytest_asyncio.fixture()
async def client_and_holder() -> AsyncIterator[tuple[AsyncClient, dict[str, ChatPipeline]]]:
    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    initialize_chat(app)  # populate rate limiter + session memory in app.state
    app.dependency_overrides[get_db] = _override_get_db
    holder: dict[str, ChatPipeline] = {}
    app.dependency_overrides[chat_api._pipeline_dep] = lambda: holder["pipeline"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac, holder

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


@pytest.mark.asyncio
async def test_chat_stream_emits_tokens_and_done(client_and_holder: tuple[AsyncClient, dict[str, ChatPipeline]]) -> None:
    ac, holder = client_and_holder
    holder["pipeline"] = _fake_pipeline([SimpleNamespace(content="<think>plan</think>Hel"), SimpleNamespace(content="lo")])

    resp = await ac.post("/api/chat/stream", json={"message": "hi"})

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert '"delta": "Hel"' in body
    assert '"delta": "lo"' in body
    assert "event: done" in body
    assert '"message": "Hello"' in body
    assert "plan" not in body  # reasoning is stripped before streaming


@pytest.mark.asyncio
async def test_chat_stream_output_guard_rejection_replaces_message(
    client_and_holder: tuple[AsyncClient, dict[str, ChatPipeline]],
) -> None:
    ac, holder = client_and_holder
    holder["pipeline"] = _fake_pipeline([SimpleNamespace(content="unsafe answer")], output_status=GuardStatus.REJECTED)

    resp = await ac.post("/api/chat/stream", json={"message": "hi"})

    assert resp.status_code == 200
    body = resp.text
    assert "event: done" in body
    assert '"status": "output_rejected"' in body
    assert '"message": "REPLACED"' in body
