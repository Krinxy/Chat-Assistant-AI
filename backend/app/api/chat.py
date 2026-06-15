from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.session import ChatSession
from ..models.user import User
from ..services.core.chat.memory import SessionMemoryManager
from ..services.core.guardrails import GuardStatus
from ..services.core.guardrails.helpers import InputSanitizer
from ..services.core.guardrails.input_guard import InputGuard
from ..services.core.guardrails.output_guard import OutputGuard
from ..services.core.guardrails.policy_guard import PolicyGuard
from ..services.core.guardrails.query_refiner import QueryRefiner
from ..services.dependency.authtoken import authtoken
from ..services.utils.config import ConfigLoader
from ..services.utils.rate_limit import RateLimiter

router = APIRouter(prefix="/chat", tags=["chat"])


# ── request/response models ────────────────────────────────────────────────────


@dataclass
class ChatRequest:
    message: str
    session_id: str = field(default="")


@dataclass
class ChatResponse:
    status: str
    user: str
    message: str
    session_id: str


# ── pipeline ───────────────────────────────────────────────────────────────────


class ChatPipeline:
    """Orchestrates the full chat request flow: input guard → refine → generate → output guard.

    All public behaviour is exposed through the single ``run`` method.
    Private methods handle individual pipeline steps for clarity and testability.
    """

    def __init__(
        self,
        input_guard: InputGuard,
        query_refiner: QueryRefiner,
        output_guard: OutputGuard,
        policy_guard: PolicyGuard,
        max_message_length: int = 4000,
        input_rejected_msg: str = "Request rejected by content policy.",
        output_rejected_msg: str = "I'm unable to provide a response to this query. Please rephrase your question.",
        input_guard_enabled: bool = True,
        query_refiner_enabled: bool = True,
        output_guard_enabled: bool = True,
    ) -> None:
        self._input_guard = input_guard
        self._query_refiner = query_refiner
        self._output_guard = output_guard
        self._policy_guard = policy_guard
        self._max_message_length = max_message_length
        self._input_rejected_msg = input_rejected_msg
        self._output_rejected_msg = output_rejected_msg
        self._input_guard_enabled = input_guard_enabled
        self._query_refiner_enabled = query_refiner_enabled
        self._output_guard_enabled = output_guard_enabled

    # ── static helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def validate_message(raw: str, max_length: int) -> str:
        """Sanitize and validate a raw message. Raises HTTP 422 on invalid input."""
        sanitized = InputSanitizer.sanitize(raw).strip()
        if not sanitized:
            raise HTTPException(status_code=422, detail="Message cannot be empty.")
        if len(sanitized) > max_length:
            raise HTTPException(status_code=422, detail=f"Message too long (max {max_length} characters).")
        return sanitized

    # ── private steps ──────────────────────────────────────────────────────────

    async def _apply_input_guard(self, message: str, session_id: str) -> bool:
        """Return True if the message should be rejected.

        Falls back to the local PolicyGuard when the LLM guard is UNAVAILABLE.
        """
        if not self._input_guard_enabled:
            return False

        outcome = await self._input_guard.check(message, session_id)
        if outcome.status == GuardStatus.REJECTED:
            return True
        if outcome.status == GuardStatus.UNAVAILABLE:
            fallback = self._policy_guard.check_local(message, session_id)
            return fallback.status == GuardStatus.REJECTED

        return False

    async def _refine_query(self, message: str, session_id: str) -> str:
        if not self._query_refiner_enabled:
            return message
        return await self._query_refiner.refine(message, session_id)

    async def _generate(self, refined_query: str, context: str = "") -> str:
        # Stub — replaced by the full RAG chain in AP 4.
        # context is the formatted conversation history injected here.
        return f"[stub] Received: {refined_query}"

    async def _apply_output_guard(self, message: str, response: str, session_id: str) -> tuple[str, str]:
        """Return (final_response, status). Replaces rejected responses with a safe message."""
        if not self._output_guard_enabled:
            return response, "ok"
        outcome = await self._output_guard.check(message, response, session_id)
        if outcome.status == GuardStatus.REJECTED:
            return self._output_rejected_msg, "output_rejected"
        return response, "ok"

    # ── main entry point ───────────────────────────────────────────────────────

    async def run(self, message: str, session_id: str, context: str = "") -> tuple[str, str]:
        """Execute the full pipeline. Returns (response_message, status).

        Raises:
            HTTPException 400: if the input guard rejects the query.
        """
        if await self._apply_input_guard(message, session_id):
            raise HTTPException(status_code=400, detail=self._input_rejected_msg)

        refined_query = await self._refine_query(message, session_id)
        generated = await self._generate(refined_query, context)
        return await self._apply_output_guard(message, generated, session_id)

    # ── factory ────────────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, config: Optional[dict[str, Any]] = None) -> "ChatPipeline":
        cfg = config or ConfigLoader.get_backend()
        llm_cfg = cfg.get("llm", {}).get("guardrails", {})
        guard_cfg = cfg.get("guardrails", {})
        api_cfg = cfg.get("api", {})
        max_len = int(api_cfg.get("input_validation", {}).get("max_message_length", 4000))
        messages_cfg = api_cfg.get("messages", {})

        return cls(
            input_guard=InputGuard.from_config(llm_cfg, guard_cfg.get("input_guard", {})),
            query_refiner=QueryRefiner.from_config(llm_cfg, guard_cfg.get("query_refiner", {})),
            output_guard=OutputGuard.from_config(llm_cfg, guard_cfg.get("output_guard", {})),
            policy_guard=PolicyGuard.from_file(),
            max_message_length=max_len,
            input_rejected_msg=str(messages_cfg.get("input_rejected", "Request rejected by content policy.")),
            output_rejected_msg=str(
                messages_cfg.get(
                    "output_rejected",
                    "I'm unable to provide a response to this query. Please rephrase your question.",
                )
            ),
            input_guard_enabled=bool(guard_cfg.get("input_guard", {}).get("enabled", True)),
            query_refiner_enabled=bool(guard_cfg.get("query_refiner", {}).get("enabled", True)),
            output_guard_enabled=bool(guard_cfg.get("output_guard", {}).get("enabled", True)),
        )


# ── app.state initializer ──────────────────────────────────────────────────────


def initialize(app: FastAPI) -> None:
    """Populate app.state with chat service dependencies. Called once from the lifespan."""
    cfg = ConfigLoader.get_backend()
    app.state.chat_pipeline = ChatPipeline.from_config(cfg)
    app.state.chat_rate_limiter = RateLimiter.from_config(cfg)
    app.state.session_memory = SessionMemoryManager.from_config(cfg)


# ── FastAPI dependencies ───────────────────────────────────────────────────────


def _pipeline_dep(request: Request) -> ChatPipeline:
    return request.app.state.chat_pipeline  # type: ignore[no-any-return]


def _rate_limiter_dep(request: Request) -> RateLimiter:
    return request.app.state.chat_rate_limiter  # type: ignore[no-any-return]


def _memory_dep(request: Request) -> SessionMemoryManager:
    return request.app.state.session_memory  # type: ignore[no-any-return]


# ── endpoint ───────────────────────────────────────────────────────────────────


@router.post("", response_model=ChatResponse)
@authtoken
async def chat(
    body: ChatRequest,
    current_user: User,
    pipeline: ChatPipeline = Depends(_pipeline_dep),
    rate_limiter: RateLimiter = Depends(_rate_limiter_dep),
    memory: SessionMemoryManager = Depends(_memory_dep),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    if not await rate_limiter.is_allowed(current_user.email):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before sending another message.")

    message = ChatPipeline.validate_message(body.message, pipeline._max_message_length)

    # Resolve session: validate existing or auto-create for first message
    if body.session_id:
        session = await db.get(ChatSession, body.session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found.")
        session_id = body.session_id
        # Restore buffer from DB summary if not already in memory
        memory.get_or_create(session_id, summary=session.summary or "")
    else:
        session_id = str(uuid.uuid4())
        db.add(ChatSession(id=session_id))
        await db.commit()
        memory.create(session_id)

    context = memory.get_context(session_id)
    response_message, status = await pipeline.run(message, session_id, context)

    # Record turns in the in-memory buffer
    memory.add_turn(session_id, "user", message)
    memory.add_turn(session_id, "assistant", response_message)

    return ChatResponse(status=status, user=current_user.email, message=response_message, session_id=session_id)
