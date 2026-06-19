from __future__ import annotations

import asyncio
import time
from collections import deque
from typing import Any


class RateLimiter:
    """Per-key sliding window rate limiter (in-memory, single-process).

    Thread-safe via asyncio.Lock. Suitable for single-process deployments;
    switch to a Redis-backed implementation for multi-replica setups.
    """

    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    # ── main entry point ───────────────────────────────────────────────────────

    async def is_allowed(self, key: str) -> bool:
        """Return True if the key is within the rate limit for this window."""
        async with self._lock:
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
    def from_config(cls, config: dict[str, Any]) -> "RateLimiter":
        rate_cfg = config.get("api", {}).get("rate_limit", {})
        return cls(
            max_requests=int(rate_cfg.get("chat_requests_per_minute", 60)),
            window_seconds=int(rate_cfg.get("window_seconds", 60)),
        )
