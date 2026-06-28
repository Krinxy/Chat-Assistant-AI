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
from backend.app.models.session import ChatSession  # noqa: E402
from backend.app.services.core.chat.memory import SessionMemoryManager  # noqa: E402
from backend.app.services.core.chat.message_store import MessageStore  # noqa: E402
from backend.app.services.core.guardrails import GuardOutcome, GuardStatus  # noqa: E402
from backend.app.services.dependency.llm import LLMClient  # noqa: E402

_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def _override_get_db() -> AsyncIterator[Any]:
    async with _Session() as session:
        yield session


# ── MessageStore unit tests ──────────────────────────────────────────────────────


@pytest_asyncio.fixture()
async def db_session() -> AsyncIterator[Any]:
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with _Session() as session:
        yield session
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_append_and_load_recent_roundtrip(db_session: Any) -> None:
    db_session.add(ChatSession(id="s1", user_id=1))
    await db_session.commit()

    await MessageStore.append_turn(db_session, "s1", "hello", "hi there")

    turns = await MessageStore.load_recent(db_session, "s1", limit=10)
    assert turns == [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi there"},
    ]


@pytest.mark.asyncio
async def test_load_recent_returns_chronological_window(db_session: Any) -> None:
    db_session.add(ChatSession(id="s2", user_id=1))
    await db_session.commit()
    for i in range(5):
        await MessageStore.append_turn(db_session, "s2", f"q{i}", f"a{i}")

    # 10 rows total; ask for the last 4 → must be the two most recent exchanges, oldest-first
    turns = await MessageStore.load_recent(db_session, "s2", limit=4)
    assert [t["content"] for t in turns] == ["q3", "a3", "q4", "a4"]


@pytest.mark.asyncio
async def test_load_recent_scoped_to_session(db_session: Any) -> None:
    db_session.add_all([ChatSession(id="a", user_id=1), ChatSession(id="b", user_id=1)])
    await db_session.commit()
    await MessageStore.append_turn(db_session, "a", "for-a", "ans-a")
    await MessageStore.append_turn(db_session, "b", "for-b", "ans-b")

    assert [t["content"] for t in await MessageStore.load_recent(db_session, "a", 10)] == ["for-a", "ans-a"]


# ── endpoint / rehydration integration ─────────────────────────────────────────────


def _fake_chat_pipeline(answer: str = "assistant answer") -> ChatPipeline:
    input_guard = MagicMock()
    input_guard.check = AsyncMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    query_refiner = MagicMock()
    query_refiner.refine = AsyncMock(side_effect=lambda q, s: q)
    output_guard = MagicMock()
    output_guard.check = AsyncMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    policy_guard = MagicMock()
    policy_guard.check_local = MagicMock(return_value=GuardOutcome(status=GuardStatus.PASSED))
    llm = MagicMock()
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content=answer))
    chat_llm = MagicMock(spec=LLMClient)
    chat_llm.get.return_value = llm
    return ChatPipeline(
        input_guard=input_guard,
        query_refiner=query_refiner,
        output_guard=output_guard,
        policy_guard=policy_guard,
        chat_llm=chat_llm,
        system_prompt="test",
    )


@pytest_asyncio.fixture()
async def app_client() -> AsyncIterator[tuple[AsyncClient, Any, dict[str, ChatPipeline]]]:
    prev_mode = os.environ.get("AUTH_MODE")
    os.environ["AUTH_MODE"] = "mock"
    os.environ["MOCK_USER_ROLE"] = "user"

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    initialize_chat(app)
    app.dependency_overrides[get_db] = _override_get_db
    holder: dict[str, ChatPipeline] = {"pipeline": _fake_chat_pipeline()}
    app.dependency_overrides[chat_api._pipeline_dep] = lambda: holder["pipeline"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac, app, holder

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if prev_mode is None:
        os.environ.pop("AUTH_MODE", None)
    else:
        os.environ["AUTH_MODE"] = prev_mode


@pytest.mark.asyncio
async def test_chat_persists_turn_and_history_reads_from_db(
    app_client: tuple[AsyncClient, Any, dict[str, ChatPipeline]],
) -> None:
    ac, _app, _holder = app_client

    resp = await ac.post("/api/chat", json={"message": "what is the revenue?"})
    assert resp.status_code == 200
    session_id = resp.json()["session_id"]

    history = await ac.get(f"/api/sessions/{session_id}/history")
    assert history.status_code == 200
    turns = history.json()["recent_turns"]
    assert turns == [
        {"role": "user", "content": "what is the revenue?"},
        {"role": "assistant", "content": "assistant answer"},
    ]


@pytest.mark.asyncio
async def test_cold_buffer_is_rehydrated_from_persisted_history(
    app_client: tuple[AsyncClient, Any, dict[str, ChatPipeline]],
) -> None:
    ac, app, _holder = app_client

    first = await ac.post("/api/chat", json={"message": "first question"})
    session_id = first.json()["session_id"]

    # Simulate a process restart: the in-memory buffers are gone, only the DB survives.
    app.state.session_memory = SessionMemoryManager()

    # A follow-up on the same session must rebuild the buffer from the durable log.
    await ac.post("/api/chat", json={"message": "second question", "session_id": session_id})

    buffer = app.state.session_memory.get(session_id)
    assert buffer is not None
    contents = [t["content"] for t in buffer.turns]
    # The prior exchange was replayed from DB, then the new exchange appended.
    assert "first question" in contents
    assert "second question" in contents


@pytest.mark.asyncio
async def test_history_survives_buffer_loss(
    app_client: tuple[AsyncClient, Any, dict[str, ChatPipeline]],
) -> None:
    ac, app, _holder = app_client

    resp = await ac.post("/api/chat", json={"message": "remember me"})
    session_id = resp.json()["session_id"]

    app.state.session_memory = SessionMemoryManager()  # buffer wiped

    history = await ac.get(f"/api/sessions/{session_id}/history")
    assert history.status_code == 200
    assert [t["content"] for t in history.json()["recent_turns"]] == ["remember me", "assistant answer"]


# ── ownership scoping (issue #38) ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_other_user_cannot_read_session_history(
    app_client: tuple[AsyncClient, Any, dict[str, ChatPipeline]],
) -> None:
    ac, _app, _holder = app_client
    try:
        os.environ["MOCK_USER_ID"] = "1"
        session_id = (await ac.post("/api/chat", json={"message": "private"})).json()["session_id"]
        assert (await ac.get(f"/api/sessions/{session_id}/history")).status_code == 200

        # A different user must not be able to read the session — reported as 404,
        # not 403, so the endpoint does not confirm that the session exists.
        os.environ["MOCK_USER_ID"] = "2"
        assert (await ac.get(f"/api/sessions/{session_id}/history")).status_code == 404
    finally:
        os.environ.pop("MOCK_USER_ID", None)


@pytest.mark.asyncio
async def test_other_user_cannot_continue_session(
    app_client: tuple[AsyncClient, Any, dict[str, ChatPipeline]],
) -> None:
    ac, _app, _holder = app_client
    try:
        os.environ["MOCK_USER_ID"] = "1"
        session_id = (await ac.post("/api/chat", json={"message": "private"})).json()["session_id"]

        os.environ["MOCK_USER_ID"] = "2"
        resp = await ac.post("/api/chat", json={"message": "intrude", "session_id": session_id})
        assert resp.status_code == 404
    finally:
        os.environ.pop("MOCK_USER_ID", None)
