from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.session import ChatSession
from ..services.core.chat.memory import SessionMemoryManager

router = APIRouter(prefix="/sessions", tags=["sessions"])


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


@router.post("", response_model=SessionCreateResponse)
async def create_session(
    db: AsyncSession = Depends(get_db),
    memory: SessionMemoryManager = Depends(_memory_dep),
) -> SessionCreateResponse:
    """Create a new chat session. Returns the session_id to use in POST /api/chat."""
    session_id = str(uuid.uuid4())
    db.add(ChatSession(id=session_id))
    await db.commit()
    memory.create(session_id)
    return SessionCreateResponse(session_id=session_id)


@router.get("/{session_id}/history", response_model=SessionHistoryResponse)
async def get_session_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    memory: SessionMemoryManager = Depends(_memory_dep),
) -> SessionHistoryResponse:
    """Return the compressed summary and recent in-memory turns for a session."""
    session = await db.get(ChatSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    buf = memory.get(session_id)
    return SessionHistoryResponse(
        session_id=session_id,
        summary=session.summary or "",
        recent_turns=buf.turns if buf else [],
    )
