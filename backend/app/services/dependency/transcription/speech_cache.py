from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from typing import Any
from uuid import uuid4

from .redis_fake import FakeRedisCache
from .redis_runtime import RedisCache, try_create_redis_cache_from_env


@dataclass(frozen=True)
class SpeechCacheConfig:
    ttl_seconds: int = 20


@dataclass(frozen=True)
class SpeechChunkState:
    session_id: str
    chunk_index: int
    stage: str
    chunk_size: int
    content_hash: str
    language: str | None
    transcript: str | None
    latency_ms: int | None


class SpeechTranscriptionCache:
    """Session-scoped speech cache that keeps only short-lived metadata/text state."""

    def __init__(
        self,
        redis_cache: FakeRedisCache | RedisCache | None = None,
        config: SpeechCacheConfig | None = None,
    ) -> None:
        self._redis_cache = redis_cache or _try_create_redis_cache_from_env() or FakeRedisCache()
        self._config = config or SpeechCacheConfig(
            ttl_seconds=_resolve_ttl_seconds_from_env(default_value=20)
        )

    @property
    def backend_name(self) -> str:
        if isinstance(self._redis_cache, RedisCache):
            return "redis"
        return "fake-redis"

    def uses_fake_backend(self) -> bool:
        return isinstance(self._redis_cache, FakeRedisCache)

    @staticmethod
    def create_session_id() -> str:
        return uuid4().hex

    def store_received_chunk(
        self,
        *,
        session_id: str,
        chunk_index: int,
        audio_chunk: bytes,
        language: str | None,
    ) -> None:
        state = SpeechChunkState(
            session_id=session_id,
            chunk_index=chunk_index,
            stage="received",
            chunk_size=len(audio_chunk),
            content_hash=hashlib.sha256(audio_chunk).hexdigest(),
            language=language,
            transcript=None,
            latency_ms=None,
        )
        self._set_chunk_state(state)

    def store_transcript(
        self,
        *,
        session_id: str,
        chunk_index: int,
        transcript: str,
        latency_ms: int,
    ) -> None:
        existing = self.get_chunk_state(session_id=session_id, chunk_index=chunk_index)

        state = SpeechChunkState(
            session_id=session_id,
            chunk_index=chunk_index,
            stage="transcribed",
            chunk_size=existing.chunk_size if existing is not None else 0,
            content_hash=existing.content_hash if existing is not None else "",
            language=existing.language if existing is not None else None,
            transcript=transcript.strip(),
            latency_ms=latency_ms,
        )
        self._set_chunk_state(state)

    def get_chunk_state(
        self,
        *,
        session_id: str,
        chunk_index: int,
    ) -> SpeechChunkState | None:
        raw_payload = self._redis_cache.get(self._chunk_key(session_id, chunk_index))
        if raw_payload is None:
            return None

        payload = json.loads(raw_payload)
        return SpeechChunkState(
            session_id=str(payload["session_id"]),
            chunk_index=int(payload["chunk_index"]),
            stage=str(payload["stage"]),
            chunk_size=int(payload["chunk_size"]),
            content_hash=str(payload["content_hash"]),
            language=_parse_optional_string(payload.get("language")),
            transcript=_parse_optional_string(payload.get("transcript")),
            latency_ms=_parse_optional_int(payload.get("latency_ms")),
        )

    def clear_session(self, session_id: str) -> None:
        keys = self._redis_cache.scan_prefix(self._session_prefix(session_id))
        if len(keys) == 0:
            return

        self._redis_cache.delete(*keys)

    def _set_chunk_state(self, state: SpeechChunkState) -> None:
        payload = json.dumps(asdict(state), sort_keys=True)
        self._redis_cache.setex(
            self._chunk_key(state.session_id, state.chunk_index),
            self._config.ttl_seconds,
            payload,
        )

    @staticmethod
    def _session_prefix(session_id: str) -> str:
        return f"speech:{session_id}:"

    @classmethod
    def _chunk_key(cls, session_id: str, chunk_index: int) -> str:
        return f"{cls._session_prefix(session_id)}chunk:{chunk_index}"


def _try_create_redis_cache_from_env() -> RedisCache | None:
    return try_create_redis_cache_from_env()


def _resolve_ttl_seconds_from_env(default_value: int) -> int:
    configured_ttl = os.getenv("SPEECH_CACHE_TTL_SECONDS", "").strip()
    if len(configured_ttl) == 0:
        return default_value

    try:
        ttl_value = int(configured_ttl)
    except ValueError:
        return default_value

    return ttl_value if ttl_value > 0 else default_value


def _parse_optional_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    normalized = value.strip()
    return normalized if len(normalized) > 0 else None


def _parse_optional_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, int):
        return value

    return None


speech_cache = SpeechTranscriptionCache()
