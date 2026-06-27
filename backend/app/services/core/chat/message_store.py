from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....models.message import ChatMessage


class MessageStore:
    """Async SQLite persistence for conversation turns.

    Durable counterpart to the in-memory ConversationBuffer: every chat exchange is
    appended here so history survives restarts and the buffer can be rehydrated.
    """

    @staticmethod
    async def append_turn(db: AsyncSession, session_id: str, user_message: str, assistant_message: str) -> None:
        """Persist one user/assistant exchange (two rows) in a single commit."""
        db.add(ChatMessage(session_id=session_id, role="user", content=user_message))
        db.add(ChatMessage(session_id=session_id, role="assistant", content=assistant_message))
        await db.commit()

    @staticmethod
    async def load_recent(db: AsyncSession, session_id: str, limit: int) -> list[dict[str, str]]:
        """Return the most recent ``limit`` messages for a session, oldest-first.

        Newest rows are selected via descending id, then reversed so the result is in
        chronological order — ready to replay into a ConversationBuffer or prompt.
        """
        stmt = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.id.desc()).limit(limit)
        rows = (await db.execute(stmt)).scalars().all()
        return [{"role": row.role, "content": row.content} for row in reversed(rows)]
