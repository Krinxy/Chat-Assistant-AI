from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.session import ChatSession
from ..models.user import User
from ..services.core.chat.memory import SessionMemoryManager
from ..services.core.chat.message_store import MessageStore
from ..services.dependency.authtoken import authtoken

router = APIRouter(prefix="/sessions", tags=["sessions"])

# Upper bound on turns returned by the history endpoint — keeps the response bounded
# for long-running sessions while still covering far more than the prompt window.
_HISTORY_LIMIT = 100


# ── request / response models ──────────────────────────────────────────────────


@dataclass
class SessionCreateResponse:
    session_id: str


@dataclass
class SessionHistoryResponse:
    session_id: str
    summary: str
    recent_turns: list[dict] = field(default_factory=list)


# ── dependency ─────────────────────────────────────────────────────────────────


def _memory_dep(request: Request) -> SessionMemoryManager:
    return request.app.state.session_memory  # type: ignore[no-any-return]


# ── endpoints ──────────────────────────────────────────────────────────────────


@router.post("", responses={503: {"description": "Database temporarily unavailable"}})
@authtoken
async def create_session(
    current_user: User,
    db: Annotated[AsyncSession, Depends(get_db)],
    memory: Annotated[SessionMemoryManager, Depends(_memory_dep)],
) -> SessionCreateResponse:
    """Create a new chat session. Returns the session_id to use in POST /api/chat."""
    session_id = str(uuid.uuid4())
    try:
        db.add(ChatSession(id=session_id, user_id=current_user.id))
        await db.commit()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable.") from exc
    memory.create(session_id)
    return SessionCreateResponse(session_id=session_id)


@router.get(
    "/{session_id}/history",
    responses={
        404: {"description": "Session not found"},
        503: {"description": "Database temporarily unavailable"},
    },
)
@authtoken
async def get_session_history(
    session_id: str,
    current_user: User,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionHistoryResponse:
    """Return the compressed summary and persisted conversation turns for a session.

    Turns are read from the durable message log (single source of truth) so the history
    is correct even after a process restart — not just what happens to be in the buffer.
    """
    try:
        session = await db.get(ChatSession, session_id)
        # A session owned by another user is reported as "not found" rather than
        # "forbidden" so the endpoint does not confirm the existence of foreign sessions.
        if session is None or session.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found.")
        recent_turns = await MessageStore.load_recent(db, session_id, _HISTORY_LIMIT)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable.") from exc
    return SessionHistoryResponse(
        session_id=session_id,
        summary=session.summary or "",
        recent_turns=recent_turns,
    )
