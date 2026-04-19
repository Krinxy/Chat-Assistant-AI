from __future__ import annotations

import time
from threading import Lock
from typing import Callable


class FakeRedisCache:
    """Minimal Redis-like cache backend with TTL support for local development."""

    def __init__(self, time_fn: Callable[[], float] | None = None) -> None:
        self._time_fn = time_fn or time.monotonic
        self._entries: dict[str, tuple[float, str]] = {}
        self._lock = Lock()

    def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be greater than zero")

        expires_at = self._time_fn() + float(ttl_seconds)

        with self._lock:
            self._purge_expired_locked()
            self._entries[key] = (expires_at, value)

    def get(self, key: str) -> str | None:
        with self._lock:
            self._purge_expired_locked()
            entry = self._entries.get(key)
            return entry[1] if entry is not None else None

    def delete(self, *keys: str) -> int:
        deleted = 0

        with self._lock:
            self._purge_expired_locked()
            for key in keys:
                if key in self._entries:
                    del self._entries[key]
                    deleted += 1

        return deleted

    def scan_prefix(self, prefix: str) -> list[str]:
        with self._lock:
            self._purge_expired_locked()
            return [key for key in self._entries if key.startswith(prefix)]

    def _purge_expired_locked(self) -> None:
        now = self._time_fn()
        expired_keys = [
            key for key, (expires_at, _value) in self._entries.items() if expires_at <= now
        ]
        for key in expired_keys:
            del self._entries[key]
