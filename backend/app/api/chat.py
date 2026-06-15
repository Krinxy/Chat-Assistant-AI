from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from fastapi import APIRouter, HTTPException

from ..models.user import User
from ..services.core.guardrails import GuardStatus
from ..services.core.guardrails.helpers import sanitize_user_input
from ..services.core.guardrails.input_guard import InputGuard
from ..services.core.guardrails.output_guard import OutputGuard
from ..services.core.guardrails.query_refiner import QueryRefiner
from ..services.dependency.authtoken import authtoken
from ..services.utils.config import ConfigLoader
from ..services.utils.rate_limit import RateLimiter

router = APIRouter(prefix="/chat", tags=["chat"])

_OUTPUT_REJECTED_MSG = "I'm unable to provide a response to this query. Please rephrase your question."
_INPUT_REJECTED_MSG = "Request rejected by content policy."

# Module-level singletons — lazily initialised on first request
_pipeline: Optional["ChatPipeline"] = None
_rate_limiter: Optional[RateLimiter] = None


def _get_rate_limiter() -> RateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        cfg = ConfigLoader.get_backend()
        rpm = int(cfg.get("api", {}).get("rate_limit", {}).get("chat_requests_per_minute", 60))
        _rate_limiter = RateLimiter(max_requests=rpm, window_seconds=60)
    return _rate_limiter


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


def _validate_message(raw: str, max_length: int) -> str:
    """Sanitize and validate a raw message string.

    Strips null bytes/control characters, enforces length limit.
    Raises HTTPException(422) on invalid input.
    """
    sanitized = sanitize_user_input(raw).strip()
    if not sanitized:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    if len(sanitized) > max_length:
        raise HTTPException(status_code=422, detail=f"Message too long (max {max_length} characters).")
    return sanitized


class ChatPipeline:
    """Orchestrates the full chat request flow: input guard → refine → generate → output guard.

    All public behaviour is exposed through the single ``run`` method.
    Private methods handle individual pipeline steps for clarity and testability.
    """

    def __init__(
        self, input_guard: InputGuard, query_refiner: QueryRefiner, output_guard: OutputGuard, max_message_length: int = 4000
    ) -> None:
        self._input_guard = input_guard
        self._query_refiner = query_refiner
        self._output_guard = output_guard
        self._max_message_length = max_message_length

    # ── private steps ──────────────────────────────────────────────────────────

    async def _apply_input_guard(self, message: str, session_id: str) -> bool:
        """Return True if the message was rejected by the input guard."""
        outcome = await self._input_guard.check(message, session_id)
        return outcome.status == GuardStatus.REJECTED

    async def _refine_query(self, message: str, session_id: str) -> str:
        return await self._query_refiner.refine(message, session_id)

    async def _generate(self, refined_query: str) -> str:
        # Stub — replaced by the full RAG chain in AP 4
        return f"[stub] Received: {refined_query}"

    async def _apply_output_guard(self, message: str, response: str, session_id: str) -> tuple[str, str]:
        """Return (final_response, status). Sanitises rejected responses."""
        outcome = await self._output_guard.check(message, response, session_id)
        if outcome.status == GuardStatus.REJECTED:
            return _OUTPUT_REJECTED_MSG, "output_rejected"
        return response, "ok"

    # ── main entry point ───────────────────────────────────────────────────────

    async def run(self, message: str, session_id: str) -> tuple[str, str]:
        """Execute the full pipeline. Returns (response_message, status).

        Raises:
            HTTPException 400: if the input guard rejects the query.
        """
        if await self._apply_input_guard(message, session_id):
            # LLM-generated rejection reason is intentionally not forwarded to the client.
            raise HTTPException(status_code=400, detail=_INPUT_REJECTED_MSG)

        refined_query = await self._refine_query(message, session_id)
        generated = await self._generate(refined_query)
        return await self._apply_output_guard(message, generated, session_id)

    # ── factory ────────────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, config: Optional[dict[str, Any]] = None) -> "ChatPipeline":
        cfg = config or ConfigLoader.get_backend()
        llm_cfg = cfg.get("llm", {}).get("guardrails", {})
        guard_cfg = cfg.get("guardrails", {})
        max_len = int(cfg.get("api", {}).get("input_validation", {}).get("max_message_length", 4000))

        return cls(
            input_guard=InputGuard.from_config(llm_cfg, guard_cfg.get("input_guard", {})),
            query_refiner=QueryRefiner.from_config(llm_cfg, guard_cfg.get("query_refiner", {})),
            output_guard=OutputGuard.from_config(llm_cfg, guard_cfg.get("output_guard", {})),
            max_message_length=max_len,
        )


def _get_pipeline() -> "ChatPipeline":
    global _pipeline
    if _pipeline is None:
        _pipeline = ChatPipeline.from_config()
    return _pipeline


@router.post("", response_model=ChatResponse)
@authtoken
async def chat(body: ChatRequest, current_user: User) -> ChatResponse:
    rate_limiter = _get_rate_limiter()
    if not await rate_limiter.is_allowed(current_user.email):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before sending another message.")

    pipeline = _get_pipeline()
    message = _validate_message(body.message, pipeline._max_message_length)
    session_id = body.session_id or str(uuid.uuid4())

    response_message, status = await pipeline.run(message, session_id)
    return ChatResponse(status=status, user=current_user.email, message=response_message, session_id=session_id)
