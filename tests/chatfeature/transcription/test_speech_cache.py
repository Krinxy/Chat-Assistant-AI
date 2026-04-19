from __future__ import annotations

import json
import pytest

import backend.app.services.dependency.transcription.speech_cache as speech_cache_module
from backend.app.services.dependency.transcription.redis_fake import FakeRedisCache
from backend.app.services.dependency.transcription.redis_runtime import RedisCache
from backend.app.services.dependency.transcription.speech_cache import (
    SpeechCacheConfig,
    SpeechTranscriptionCache,
)


class _ManualClock:
    def __init__(self, start: float = 100.0) -> None:
        self._value = start

    def __call__(self) -> float:
        return self._value

    def advance(self, seconds: float) -> None:
        self._value += seconds


class _RedisLikeCache:
    def __init__(self) -> None:
        self._entries: dict[str, str] = {}

    def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        _ = ttl_seconds
        self._entries[key] = value

    def get(self, key: str) -> str | None:
        return self._entries.get(key)

    def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self._entries:
                del self._entries[key]
                deleted += 1
        return deleted

    def scan(self, cursor: int, match: str, count: int) -> tuple[int, list[str]]:
        _ = cursor
        _ = count
        prefix = match[:-1] if match.endswith("*") else match
        keys = [key for key in self._entries if key.startswith(prefix)]
        return (0, keys)


def test_cache_overwrites_chunk_state_without_storing_raw_audio() -> None:
    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    session_id = "session-cache-1"

    cache.store_received_chunk(
        session_id=session_id,
        chunk_index=0,
        audio_chunk=b"binary-audio-chunk",
        language="de",
    )

    cache.store_transcript(
        session_id=session_id,
        chunk_index=0,
        transcript="Hallo Welt",
        latency_ms=35,
    )

    state = cache.get_chunk_state(session_id=session_id, chunk_index=0)

    assert state is not None
    assert state.stage == "transcribed"
    assert state.transcript == "Hallo Welt"
    assert state.chunk_size == len(b"binary-audio-chunk")
    assert not hasattr(state, "audio_chunk")

    raw = cache._redis_cache.get(f"speech:{session_id}:chunk:0")  # noqa: SLF001
    assert raw is not None
    payload = json.loads(raw)
    assert "audio_chunk" not in payload


def test_cache_ttl_is_short_lived_for_speech_entries() -> None:
    clock = _ManualClock()
    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(time_fn=clock),
        config=SpeechCacheConfig(ttl_seconds=2),
    )

    cache.store_received_chunk(
        session_id="session-cache-2",
        chunk_index=1,
        audio_chunk=b"chunk",
        language="en",
    )
    assert cache.get_chunk_state(session_id="session-cache-2", chunk_index=1) is not None

    clock.advance(3)

    assert cache.get_chunk_state(session_id="session-cache-2", chunk_index=1) is None


def test_cache_clear_session_removes_all_chunk_entries() -> None:
    cache = SpeechTranscriptionCache(
        redis_cache=FakeRedisCache(),
        config=SpeechCacheConfig(ttl_seconds=20),
    )
    session_id = "session-cache-3"

    cache.store_received_chunk(
        session_id=session_id,
        chunk_index=0,
        audio_chunk=b"one",
        language="de",
    )
    cache.store_received_chunk(
        session_id=session_id,
        chunk_index=1,
        audio_chunk=b"two",
        language="de",
    )

    cache.clear_session(session_id)

    assert cache.get_chunk_state(session_id=session_id, chunk_index=0) is None
    assert cache.get_chunk_state(session_id=session_id, chunk_index=1) is None


def test_cache_uses_connected_redis_backend_when_available(monkeypatch) -> None:
    redis_like = _RedisLikeCache()
    monkeypatch.setattr(
        speech_cache_module,
        "_try_create_redis_cache_from_env",
        lambda: RedisCache(redis_like),
    )

    cache = SpeechTranscriptionCache(config=SpeechCacheConfig(ttl_seconds=20))

    assert cache.backend_name == "redis"
    assert cache.uses_fake_backend() is False


def test_cache_falls_back_to_fake_backend_when_redis_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(
        speech_cache_module,
        "_try_create_redis_cache_from_env",
        lambda: None,
    )

    cache = SpeechTranscriptionCache(config=SpeechCacheConfig(ttl_seconds=20))

    assert cache.backend_name == "fake-redis"
    assert cache.uses_fake_backend() is True


def test_fake_redis_rejects_non_positive_ttl() -> None:
    cache = FakeRedisCache()

    with pytest.raises(ValueError, match="ttl_seconds"):
        cache.setex("speech:invalid", 0, "payload")
