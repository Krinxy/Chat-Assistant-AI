from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from openai import OpenAIError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.session import ChatSession
from ..models.user import User
from ..services.core.agents.persona_loader import PersonaLoader
from ..services.core.chat.memory import SessionMemoryManager
from ..services.core.guardrails import GuardStatus
from ..services.core.guardrails.helpers import InputSanitizer
from ..services.core.guardrails.input_guard import InputGuard
from ..services.core.guardrails.output_guard import OutputGuard
from ..services.core.guardrails.policy_guard import PolicyGuard
from ..services.core.guardrails.query_refiner import QueryRefiner
from ..services.dependency.authtoken import authtoken
from ..services.dependency.llm import LLMClient, LLMNotConfiguredError, LLMUnavailableError
from ..services.utils.config import ConfigLoader
from ..services.utils.rate_limit import RateLimiter
from ..services.utils.streaming import ThinkBlockFilter, format_sse, strip_think_blocks

_DEFAULT_SYSTEM_PROMPT = "You are a helpful, concise assistant."

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


@dataclass
class StreamEvent:
    """A single event emitted by ``ChatPipeline.run_stream``.

    ``kind`` is one of ``"delta"`` (a visible answer fragment), ``"done"`` (final
    text + output-guard status), or ``"error"`` (generation could not proceed).
    """

    kind: str
    text: str = ""
    status: str = "ok"
    detail: str = ""


# ── pipeline ───────────────────────────────────────────────────────────────────


class ChatPipeline:
    """Orchestrates the full chat request flow: input guard → refine → generate → output guard.

    ``run`` returns the complete response in one shot; ``run_stream`` yields the
    answer token-by-token (the input guard runs separately via ``screen_input``).
    Private methods handle individual pipeline steps for clarity and testability.
    """

    def __init__(
        self,
        input_guard: InputGuard,
        query_refiner: QueryRefiner,
        output_guard: OutputGuard,
        policy_guard: PolicyGuard,
        chat_llm: LLMClient,
        system_prompt: str = _DEFAULT_SYSTEM_PROMPT,
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
        self._chat_llm = chat_llm
        self._system_prompt = system_prompt or _DEFAULT_SYSTEM_PROMPT
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

    def _build_messages(self, query: str, context: str) -> list[BaseMessage]:
        """Assemble the prompt: persona system prompt + conversation history + user query.

        In AP 4 this is replaced by the full RAG prompt (retrieved chunks injected
        as context). For now the naked LLM call uses only the conversation history.
        """
        messages: list[BaseMessage] = [SystemMessage(content=self._system_prompt)]
        if context:
            messages.append(SystemMessage(content=f"Conversation so far:\n{context}"))
        messages.append(HumanMessage(content=query))
        return messages

    async def _generate(self, refined_query: str, context: str = "") -> str:
        """Generate the answer via a single (non-streamed) gateway call.

        Raises:
            LLMNotConfiguredError: if the gateway credentials are missing.
            LLMUnavailableError: if the gateway call fails transiently (5xx, timeout, …).
        """
        llm = self._chat_llm.get()
        try:
            response = await llm.ainvoke(self._build_messages(refined_query, context))
        except OpenAIError as exc:
            raise LLMUnavailableError(str(exc)) from exc
        raw = response.content if isinstance(response.content, str) else str(response.content)
        return strip_think_blocks(raw).strip()

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

    async def screen_input(self, message: str, session_id: str) -> bool:
        """Return True if the input guard (with local policy fallback) rejects the message."""
        return await self._apply_input_guard(message, session_id)

    async def run_stream(self, message: str, session_id: str, context: str = "") -> AsyncIterator[StreamEvent]:
        """Stream the answer token-by-token.

        The input guard is expected to have run already (via ``screen_input``) so a
        rejection can return a real HTTP 400 before streaming starts. This method
        refines the query, streams visible tokens (reasoning stripped), then runs
        the blocking output guard on the assembled answer and emits a final event.
        """
        refined_query = await self._refine_query(message, session_id)
        think_filter = ThinkBlockFilter()
        collected: list[str] = []

        try:
            llm = self._chat_llm.get()
            async for chunk in llm.astream(self._build_messages(refined_query, context)):
                content = chunk.content
                if content is None:
                    continue
                piece = content if isinstance(content, str) else str(content)
                if not piece:
                    continue
                visible = think_filter.feed(piece)
                if visible:
                    collected.append(visible)
                    yield StreamEvent(kind="delta", text=visible)
            tail = think_filter.flush()
            if tail:
                collected.append(tail)
                yield StreamEvent(kind="delta", text=tail)
        except LLMNotConfiguredError:
            yield StreamEvent(kind="error", status="llm_unavailable", detail="The language model is not configured.")
            return
        except OpenAIError:
            # Upstream failure (502 Bad Gateway, timeout, connection error, …). May fire
            # before or mid-stream; either way the client gets a clean terminal error.
            yield StreamEvent(kind="error", status="llm_unavailable", detail="The language model is temporarily unavailable.")
            return

        full_answer = "".join(collected).strip()
        final, status = await self._apply_output_guard(message, full_answer, session_id)
        yield StreamEvent(kind="done", text=final, status=status)

    # ── factory ────────────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, config: Optional[dict[str, Any]] = None) -> "ChatPipeline":
        cfg = config or ConfigLoader.get_backend()
        llm_cfg = cfg.get("llm", {}).get("guardrails", {})
        chat_llm_cfg = cfg.get("llm", {}).get("chat", {})
        guard_cfg = cfg.get("guardrails", {})
        api_cfg = cfg.get("api", {})
        max_len = int(api_cfg.get("input_validation", {}).get("max_message_length", 4000))
        messages_cfg = api_cfg.get("messages", {})

        return cls(
            input_guard=InputGuard.from_config(llm_cfg, guard_cfg.get("input_guard", {})),
            query_refiner=QueryRefiner.from_config(llm_cfg, guard_cfg.get("query_refiner", {})),
            output_guard=OutputGuard.from_config(llm_cfg, guard_cfg.get("output_guard", {})),
            policy_guard=PolicyGuard.from_file(),
            chat_llm=LLMClient.from_config(chat_llm_cfg),
            system_prompt=PersonaLoader.load_assistant() or _DEFAULT_SYSTEM_PROMPT,
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


# ── shared helpers ───────────────────────────────────────────────────────────────


async def _resolve_session(body: ChatRequest, memory: SessionMemoryManager, db: AsyncSession) -> str:
    """Validate the requested session or auto-create one for the first message.

    Raises:
        HTTPException 404: if a provided session_id does not exist.
        HTTPException 503: if the database is unavailable.
    """
    try:
        if body.session_id:
            session = await db.get(ChatSession, body.session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found.")
            # Restore buffer from DB summary if not already in memory
            memory.get_or_create(body.session_id, summary=session.summary or "")
            return body.session_id

        session_id = str(uuid.uuid4())
        db.add(ChatSession(id=session_id))
        await db.commit()
        memory.create(session_id)
        return session_id
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable.") from exc


# ── endpoint ───────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=ChatResponse,
    responses={
        400: {"description": "Guardrail policy violation"},
        404: {"description": "Session not found"},
        422: {"description": "Message validation failed"},
        429: {"description": "Rate limit exceeded"},
        503: {"description": "LLM or database temporarily unavailable"},
    },
)
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
    session_id = await _resolve_session(body, memory, db)
    context = memory.get_context(session_id)

    try:
        response_message, status = await pipeline.run(message, session_id, context)
    except LLMNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="The language model is not configured.") from exc
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail="The language model is temporarily unavailable. Please try again shortly.") from exc

    # Record turns in the in-memory buffer
    memory.add_turn(session_id, "user", message)
    memory.add_turn(session_id, "assistant", response_message)

    return ChatResponse(status=status, user=current_user.email, message=response_message, session_id=session_id)


@router.post(
    "/stream",
    responses={
        400: {"description": "Guardrail policy violation"},
        404: {"description": "Session not found"},
        422: {"description": "Message validation failed"},
        429: {"description": "Rate limit exceeded"},
        503: {"description": "Database temporarily unavailable"},
    },
)
@authtoken
async def chat_stream(
    body: ChatRequest,
    current_user: User,
    pipeline: ChatPipeline = Depends(_pipeline_dep),
    rate_limiter: RateLimiter = Depends(_rate_limiter_dep),
    memory: SessionMemoryManager = Depends(_memory_dep),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream the answer token-by-token as Server-Sent Events.

    Wire format: ``delta`` frames carry ``{"delta": "..."}``; the terminal frame is
    ``event: done`` with the final (output-guarded) message, or ``event: error`` if
    generation could not proceed. On output-guard rejection the ``done`` message
    replaces the streamed text — clients should swap it in.
    """
    if not await rate_limiter.is_allowed(current_user.email):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before sending another message.")

    message = ChatPipeline.validate_message(body.message, pipeline._max_message_length)
    session_id = await _resolve_session(body, memory, db)

    if await pipeline.screen_input(message, session_id):
        raise HTTPException(status_code=400, detail=pipeline._input_rejected_msg)

    context = memory.get_context(session_id)

    async def event_source() -> AsyncIterator[str]:
        async for ev in pipeline.run_stream(message, session_id, context):
            if ev.kind == "delta":
                yield format_sse({"delta": ev.text})
            elif ev.kind == "error":
                yield format_sse({"status": ev.status, "detail": ev.detail}, event="error")
                return
            elif ev.kind == "done":
                memory.add_turn(session_id, "user", message)
                memory.add_turn(session_id, "assistant", ev.text)
                yield format_sse(
                    {"status": ev.status, "session_id": session_id, "message": ev.text},
                    event="done",
                )

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
