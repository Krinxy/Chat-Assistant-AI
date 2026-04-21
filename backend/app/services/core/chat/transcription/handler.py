from __future__ import annotations

import time
from typing import Any, Callable

from starlette.concurrency import run_in_threadpool

from ....dependency.transcription.speech_cache import SpeechTranscriptionCache, speech_cache
from .runtime import invoke_local_transcription_lambda, runtime_service
from .transcriber import WhisperDependenciesMissingError, WhisperInferenceError

RuntimeInvoker = Callable[[bytes, str | None, str | None], str]


class LiveTranscriptionHandler:
    """Connection-level orchestration for websocket speech transcription."""

    def __init__(
        self,
        runtime_invoker: RuntimeInvoker | None = None,
        cache_backend: SpeechTranscriptionCache | None = None,
    ) -> None:
        self._runtime_invoker = runtime_invoker or invoke_local_transcription_lambda
        self._runtime_service = runtime_service if runtime_invoker is None else None
        self._cache_backend = cache_backend or speech_cache

    def open_session(self) -> str:
        return self._cache_backend.create_session_id()

    def close_session(self, session_id: str) -> None:
        self._cache_backend.clear_session(session_id)

    def recommended_max_inflight_chunks(self) -> int:
        if self._runtime_service is None:
            return 1

        return self._runtime_service.recommended_max_inflight_chunks()

    @staticmethod
    def normalize_language(language: str | None) -> str | None:
        if language is None:
            return None

        normalized = language.strip().lower()
        if len(normalized) == 0:
            return None

        if "-" in normalized:
            return normalized.split("-", maxsplit=1)[0]

        return normalized

    async def transcribe_chunk(
        self,
        *,
        session_id: str,
        audio_chunk: bytes,
        chunk_index: int,
        language: str | None,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        self._cache_backend.store_received_chunk(
            session_id=session_id,
            chunk_index=chunk_index,
            audio_chunk=audio_chunk,
            language=language,
        )

        started_at = time.perf_counter()

        try:
            text = await run_in_threadpool(
                self._runtime_invoker,
                audio_chunk,
                language,
                mime_type,
            )
        except WhisperDependenciesMissingError:
            return {
                "type": "error",
                "message": 'Whisper dependencies missing. Install with: pip install -e ".[backend]"',
            }
        except WhisperInferenceError:
            return {
                "type": "empty",
                "chunk_index": chunk_index,
                "latency_ms": int((time.perf_counter() - started_at) * 1000),
            }

        latency_ms = int((time.perf_counter() - started_at) * 1000)

        normalized_text = text.strip()
        if len(normalized_text) == 0:
            return {
                "type": "empty",
                "chunk_index": chunk_index,
                "latency_ms": latency_ms,
            }

        self._cache_backend.store_transcript(
            session_id=session_id,
            chunk_index=chunk_index,
            transcript=normalized_text,
            latency_ms=latency_ms,
        )

        return {
            "type": "transcript",
            "text": normalized_text,
            "chunk_index": chunk_index,
            "is_final": True,
            "latency_ms": latency_ms,
        }
