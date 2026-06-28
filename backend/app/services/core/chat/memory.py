from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ....config import AppConfig


class ConversationBuffer:
    """Rolling in-memory buffer of conversation turns for a single session.

    Keeps the last ``max_turns`` exchanges. When the buffer is full, the oldest
    turns are discarded (no LLM compression yet — that is added in AP 4 once the
    main generation chain is wired).
    """

    def __init__(self, max_turns: int = 10, summary: str = "") -> None:
        self._turns: list[dict[str, str]] = []
        self._max_turns = max_turns
        self._summary = summary

    def add(self, role: str, content: str) -> None:
        """Append a turn and drop the oldest ones when the window is exceeded."""
        self._turns.append({"role": role, "content": content})
        if len(self._turns) > self._max_turns:
            self._turns = self._turns[-self._max_turns :]

    def get_context(self) -> str:
        """Return a formatted context string ready for LLM injection."""
        parts: list[str] = []
        if self._summary:
            parts.append(f"[Conversation Summary]\n{self._summary}")
        if self._turns:
            history = "\n".join(f"{t['role'].capitalize()}: {t['content']}" for t in self._turns)
            parts.append(f"[Recent Conversation]\n{history}")
        return "\n\n".join(parts)

    @property
    def turns(self) -> list[dict[str, str]]:
        return list(self._turns)

    @property
    def summary(self) -> str:
        return self._summary

    @property
    def is_empty(self) -> bool:
        return not self._turns and not self._summary

    @property
    def turn_count(self) -> int:
        return len(self._turns)


class SessionMemoryManager:
    """Process-scoped registry of ConversationBuffers keyed by session_id.

    Stored in ``app.state`` — lives for the lifetime of the process.
    If the process restarts, in-memory buffers are lost; only the DB summary
    (populated by AP 4 compression) survives.
    """

    def __init__(self, max_turns: int = 10) -> None:
        self._buffers: dict[str, ConversationBuffer] = {}
        self._max_turns = max_turns

    def create(self, session_id: str, summary: str = "") -> ConversationBuffer:
        buffer = ConversationBuffer(max_turns=self._max_turns, summary=summary)
        self._buffers[session_id] = buffer
        return buffer

    def get(self, session_id: str) -> ConversationBuffer | None:
        return self._buffers.get(session_id)

    def get_or_create(self, session_id: str, summary: str = "") -> ConversationBuffer:
        if session_id not in self._buffers:
            return self.create(session_id, summary)
        return self._buffers[session_id]

    def add_turn(self, session_id: str, role: str, content: str) -> None:
        self.get_or_create(session_id).add(role, content)

    def get_context(self, session_id: str) -> str:
        buf = self._buffers.get(session_id)
        return buf.get_context() if buf and not buf.is_empty else ""

    @property
    def max_turns(self) -> int:
        return self._max_turns

    @classmethod
    def from_config(cls, config: AppConfig) -> "SessionMemoryManager":
        return cls(max_turns=config.api.max_context_turns)
