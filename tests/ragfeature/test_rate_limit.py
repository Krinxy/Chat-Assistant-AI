from __future__ import annotations

import asyncio

import pytest

from backend.app.services.utils.rate_limit import RateLimiter


@pytest.mark.asyncio
async def test_allows_requests_within_limit() -> None:
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    assert await limiter.is_allowed("user@example.com") is True
    assert await limiter.is_allowed("user@example.com") is True
    assert await limiter.is_allowed("user@example.com") is True


@pytest.mark.asyncio
async def test_blocks_request_exceeding_limit() -> None:
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    await limiter.is_allowed("user@test.com")
    await limiter.is_allowed("user@test.com")
    assert await limiter.is_allowed("user@test.com") is False


@pytest.mark.asyncio
async def test_different_keys_are_independent() -> None:
    limiter = RateLimiter(max_requests=1, window_seconds=60)
    assert await limiter.is_allowed("alice@example.com") is True
    assert await limiter.is_allowed("bob@example.com") is True
    assert await limiter.is_allowed("alice@example.com") is False


@pytest.mark.asyncio
async def test_window_expiry_allows_new_requests() -> None:
    limiter = RateLimiter(max_requests=1, window_seconds=1)
    assert await limiter.is_allowed("user@example.com") is True
    assert await limiter.is_allowed("user@example.com") is False
    await asyncio.sleep(1.05)
    assert await limiter.is_allowed("user@example.com") is True
