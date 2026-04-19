from __future__ import annotations

import asyncio

from backend.app.services.core.chat.transcription.handler import LiveTranscriptionHandler
from backend.app.services.core.chat.transcription.transcriber import (
    WhisperDependenciesMissingError,
    WhisperInferenceError,
)
from backend.app.services.dependency.transcription.redis_fake import FakeRedisCache
from backend.app.services.dependency.transcription.speech_cache import (
    SpeechCacheConfig,
    SpeechTranscriptionCache,
)


def test_normalize_language_behaves_like_locale_parser() -> None:
    assert LiveTranscriptionHandler.normalize_language("de-DE") == "de"
    assert LiveTranscriptionHandler.normalize_language("en") == "en"
    assert LiveTranscriptionHandler.normalize_language(" ") is None
    assert LiveTranscriptionHandler.normalize_language(None) is None


def test_handler_returns_transcript_payload_and_caches_transcribed_state() -> None:
    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    observed_mime_types: list[str | None] = []

    def _runtime_invoker(_audio: bytes, _language: str | None, mime_type: str | None) -> str:
        observed_mime_types.append(mime_type)
        return " Hallo Welt "

    handler = LiveTranscriptionHandler(
        runtime_invoker=_runtime_invoker,
        cache_backend=cache,
    )

    session_id = handler.open_session()

    payload = asyncio.run(
        handler.transcribe_chunk(
            session_id=session_id,
            audio_chunk=b"chunk",
            chunk_index=3,
            language="de",
            mime_type="audio/webm;codecs=opus",
        )
    )

    cached_state = cache.get_chunk_state(session_id=session_id, chunk_index=3)

    assert payload["type"] == "transcript"
    assert payload["text"] == "Hallo Welt"
    assert payload["chunk_index"] == 3
    assert cached_state is not None
    assert cached_state.stage == "transcribed"
    assert cached_state.transcript == "Hallo Welt"
    assert observed_mime_types == ["audio/webm;codecs=opus"]

    handler.close_session(session_id)
    assert cache.get_chunk_state(session_id=session_id, chunk_index=3) is None


def test_handler_maps_dependency_error_to_message() -> None:
    def _raise_dependency(
        _audio: bytes,
        _language: str | None,
        _mime_type: str | None,
    ) -> str:
        raise WhisperDependenciesMissingError("missing")

    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    handler = LiveTranscriptionHandler(
        runtime_invoker=_raise_dependency,
        cache_backend=cache,
    )

    session_id = handler.open_session()
    payload = asyncio.run(
        handler.transcribe_chunk(
            session_id=session_id,
            audio_chunk=b"chunk",
            chunk_index=0,
            language=None,
        )
    )

    cached_state = cache.get_chunk_state(session_id=session_id, chunk_index=0)

    assert payload == {
        "type": "error",
        "message": 'Whisper dependencies missing. Install with: pip install -e ".[backend]"',
    }
    assert cached_state is not None
    assert cached_state.stage == "received"


def test_handler_maps_inference_error_to_empty_chunk() -> None:
    def _raise_inference(
        _audio: bytes,
        _language: str | None,
        _mime_type: str | None,
    ) -> str:
        raise WhisperInferenceError("failed")

    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    handler = LiveTranscriptionHandler(
        runtime_invoker=_raise_inference,
        cache_backend=cache,
    )

    session_id = handler.open_session()
    payload = asyncio.run(
        handler.transcribe_chunk(
            session_id=session_id,
            audio_chunk=b"chunk",
            chunk_index=0,
            language=None,
        )
    )

    cached_state = cache.get_chunk_state(session_id=session_id, chunk_index=0)

    assert payload["type"] == "empty"
    assert payload["chunk_index"] == 0
    assert isinstance(payload["latency_ms"], int)
    assert cached_state is not None
    assert cached_state.stage == "received"
