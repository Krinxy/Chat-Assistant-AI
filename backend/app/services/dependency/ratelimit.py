from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class IpRateLimiter:
    """IP-based sliding-window rate limiter for FastAPI routes (auth endpoints).

    State is class-level — one shared window per process.
    Not distributed: use Redis-backed slowapi for multi-process deployments.
    """

    _hits: dict[str, list[float]] = defaultdict(list)

    @classmethod
    def check(cls, request: Request, *, limit: int = 5, window: int = 60) -> None:
        """Raise HTTP 429 if the request key exceeds the rate limit."""
        ip = request.client.host if request.client else "unknown"
        key = f"{ip}:{request.url.path}"
        now = time.monotonic()
        cutoff = now - window

        active = [t for t in cls._hits[key] if t > cutoff]
        cls._hits[key] = active

        if len(active) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {window} seconds.",
                headers={"Retry-After": str(window)},
            )

        cls._hits[key].append(now)


def check_rate_limit(request: Request, *, limit: int = 5, window: int = 60) -> None:
    """Module-level alias kept for auth.py backward compatibility."""
    IpRateLimiter.check(request, limit=limit, window=window)
