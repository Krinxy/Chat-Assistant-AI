from __future__ import annotations

import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

import backend.app.services.core.chat.transcription.websocket as websocket_core
from backend.app.main import create_app
from backend.app.services.core.chat.transcription.handler import LiveTranscriptionHandler
from backend.app.services.core.chat.transcription.transcriber import WhisperInferenceError
from backend.app.services.dependency.transcription.redis_fake import FakeRedisCache
from backend.app.services.dependency.transcription.speech_cache import (
    SpeechCacheConfig,
    SpeechTranscriptionCache,
)


def test_backend_health_endpoint_is_available() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ws_transcription_streams_transcript_payload_and_clears_cache(monkeypatch) -> None:
    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    observed_calls: list[tuple[str | None, str | None]] = []

    def _runtime_invoker(
        _audio: bytes,
        language: str | None,
        mime_type: str | None,
    ) -> str:
        observed_calls.append((language, mime_type))
        return "Hallo Welt"

    handler = LiveTranscriptionHandler(
        runtime_invoker=_runtime_invoker,
        cache_backend=cache,
    )
    monkeypatch.setattr(websocket_core, "session_handler", handler)

    app = FastAPI()
    app.include_router(websocket_core.router)
    client = TestClient(app)

    with client.websocket_connect("/ws/transcribe") as websocket:
        ready_payload = websocket.receive_json()
        assert ready_payload["type"] == "ready"
        session_id = str(ready_payload["session_id"])

        websocket.send_text(
            json.dumps(
                {
                    "type": "start",
                    "language": "de-DE",
                    "mime_type": "audio/webm;codecs=opus",
                }
            )
        )
        started_payload = websocket.receive_json()
        assert started_payload["type"] == "started"
        assert started_payload["language"] == "de"
        assert started_payload["mime_type"] == "audio/webm;codecs=opus"

        websocket.send_bytes(b"chunk-bytes")
        transcript_payload = websocket.receive_json()

        cached_state = cache.get_chunk_state(session_id=session_id, chunk_index=0)
        assert cached_state is not None
        assert cached_state.stage == "transcribed"
        assert cached_state.transcript == "Hallo Welt"

        websocket.send_text(json.dumps({"type": "stop"}))
        stopped_payload = websocket.receive_json()
        assert stopped_payload == {"type": "stopped"}

    assert transcript_payload["type"] == "transcript"
    assert transcript_payload["text"] == "Hallo Welt"
    assert transcript_payload["chunk_index"] == 0
    assert cache.get_chunk_state(session_id=session_id, chunk_index=0) is None
    assert observed_calls == [("de", "audio/webm;codecs=opus")]


def test_ws_returns_empty_for_failed_chunk_inference(monkeypatch) -> None:
    def _raise_inference(
        _audio: bytes,
        _language: str | None,
        _mime_type: str | None,
    ) -> str:
        raise WhisperInferenceError("fail")

    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    handler = LiveTranscriptionHandler(
        runtime_invoker=_raise_inference,
        cache_backend=cache,
    )
    monkeypatch.setattr(websocket_core, "session_handler", handler)

    app = FastAPI()
    app.include_router(websocket_core.router)
    client = TestClient(app)

    with client.websocket_connect("/ws/transcribe") as websocket:
        ready_payload = websocket.receive_json()
        session_id = str(ready_payload["session_id"])
        websocket.send_bytes(b"bad")
        websocket.send_text(json.dumps({"type": "stop"}))
        stopped_payload = websocket.receive_json()

    assert stopped_payload == {"type": "stopped"}
    assert cache.get_chunk_state(session_id=session_id, chunk_index=0) is None
