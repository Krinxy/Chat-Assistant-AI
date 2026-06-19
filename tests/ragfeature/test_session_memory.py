from __future__ import annotations

from backend.app.services.core.chat.memory import ConversationBuffer, SessionMemoryManager


class TestConversationBuffer:
    def test_starts_empty(self) -> None:
        buf = ConversationBuffer()
        assert buf.is_empty
        assert buf.turn_count == 0

    def test_add_single_turn(self) -> None:
        buf = ConversationBuffer()
        buf.add("user", "Hello")
        assert buf.turn_count == 1
        assert not buf.is_empty

    def test_get_context_no_summary(self) -> None:
        buf = ConversationBuffer()
        buf.add("user", "Hello")
        buf.add("assistant", "Hi there")
        ctx = buf.get_context()
        assert "[Recent Conversation]" in ctx
        assert "User: Hello" in ctx
        assert "Assistant: Hi there" in ctx

    def test_get_context_with_summary(self) -> None:
        buf = ConversationBuffer(summary="User asked about revenue last week.")
        buf.add("user", "And now?")
        ctx = buf.get_context()
        assert "[Conversation Summary]" in ctx
        assert "User asked about revenue" in ctx
        assert "[Recent Conversation]" in ctx

    def test_get_context_empty_returns_empty_string(self) -> None:
        buf = ConversationBuffer()
        assert buf.get_context() == ""

    def test_rolling_window_drops_oldest_turns(self) -> None:
        buf = ConversationBuffer(max_turns=3)
        for i in range(5):
            buf.add("user", f"msg {i}")
        assert buf.turn_count == 3
        assert buf.turns[0]["content"] == "msg 2"
        assert buf.turns[-1]["content"] == "msg 4"

    def test_summary_only_not_empty(self) -> None:
        buf = ConversationBuffer(summary="prior context")
        assert not buf.is_empty

    def test_turns_returns_copy(self) -> None:
        buf = ConversationBuffer()
        buf.add("user", "test")
        turns = buf.turns
        turns.clear()
        assert buf.turn_count == 1


class TestSessionMemoryManager:
    def test_create_returns_buffer(self) -> None:
        mgr = SessionMemoryManager()
        buf = mgr.create("sess-1")
        assert buf is not None
        assert buf.is_empty

    def test_get_returns_none_for_unknown_session(self) -> None:
        mgr = SessionMemoryManager()
        assert mgr.get("unknown") is None

    def test_get_or_create_idempotent(self) -> None:
        mgr = SessionMemoryManager()
        buf1 = mgr.get_or_create("sess-1")
        buf2 = mgr.get_or_create("sess-1")
        assert buf1 is buf2

    def test_add_turn_creates_buffer_if_missing(self) -> None:
        mgr = SessionMemoryManager()
        mgr.add_turn("sess-2", "user", "Hello")
        buf = mgr.get("sess-2")
        assert buf is not None
        assert buf.turn_count == 1

    def test_get_context_empty_for_unknown_session(self) -> None:
        mgr = SessionMemoryManager()
        assert mgr.get_context("does-not-exist") == ""

    def test_get_context_returns_formatted_context(self) -> None:
        mgr = SessionMemoryManager()
        mgr.add_turn("sess-3", "user", "What is Q3 revenue?")
        mgr.add_turn("sess-3", "assistant", "Q3 revenue was 4.2M.")
        ctx = mgr.get_context("sess-3")
        assert "Q3 revenue" in ctx

    def test_from_config_reads_max_context_turns(self) -> None:
        mgr = SessionMemoryManager.from_config({"api": {"session": {"max_context_turns": 5}}})
        assert mgr._max_turns == 5

    def test_from_config_default_fallback(self) -> None:
        mgr = SessionMemoryManager.from_config({})
        assert mgr._max_turns == 10
