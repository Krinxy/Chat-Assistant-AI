from __future__ import annotations

import time
from collections import deque
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ...config import AppConfig


class RateLimiter:
    """Per-key sliding window rate limiter (in-memory, single-process).

    No locking needed: asyncio is single-threaded and dict/deque operations
    are atomic within a single event-loop turn (no await inside is_allowed).
    Switch to a Redis-backed implementation for multi-replica setups.
    """

    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = {}

    async def is_allowed(self, key: str) -> bool:
        """Return True if the key is within the rate limit for this window."""
        now = time.monotonic()
        cutoff = now - self._window_seconds
        if key not in self._buckets:
            self._buckets[key] = deque()
        bucket = self._buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self._max_requests:
            return False
        bucket.append(now)
        return True

    @classmethod
    def from_config(cls, config: AppConfig) -> RateLimiter:
        return cls(
            max_requests=config.api.chat_requests_per_minute,
            window_seconds=config.api.chat_window_seconds,
        )
