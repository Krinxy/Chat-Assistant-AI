from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

# Sliding-window counters: {key: [hit_timestamp, ...]}
_hits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(request: Request, *, limit: int = 5, window: int = 60) -> None:
    """
    In-memory sliding window rate limiter.
    Key = client IP + URL path.  Cleans up expired buckets on every call.
    Not distributed — use Redis-backed slowapi for multi-process deployments.
    """
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}:{request.url.path}"
    now = time.monotonic()
    cutoff = now - window

    active = [t for t in _hits[key] if t > cutoff]
    _hits[key] = active

    if len(active) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Try again in {window} seconds.",
            headers={"Retry-After": str(window)},
        )

    _hits[key].append(now)
