from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RedisConnectionSettings:
    url: str | None
    host: str | None
    port: int
    db: int
    username: str | None
    password: str | None
    ssl: bool
    timeout_seconds: float

    @property
    def has_configuration(self) -> bool:
        return self.url is not None or self.host is not None


class RedisCache:
    """Thin adapter exposing Redis operations required by speech cache."""

    def __init__(self, client: Any) -> None:
        self._client = client

    def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        self._client.setex(key, ttl_seconds, value)

    def get(self, key: str) -> str | None:
        value = self._client.get(key)
        if value is None:
            return None

        if isinstance(value, bytes):
            return value.decode("utf-8")

        if isinstance(value, str):
            return value

        return str(value)

    def delete(self, *keys: str) -> int:
        if len(keys) == 0:
            return 0

        deleted = self._client.delete(*keys)
        return int(deleted)

    def scan_prefix(self, prefix: str) -> list[str]:
        cursor = 0
        pattern = f"{prefix}*"
        keys: list[str] = []

        while True:
            cursor, batch = self._client.scan(cursor=cursor, match=pattern, count=100)
            for key in batch:
                if isinstance(key, bytes):
                    keys.append(key.decode("utf-8"))
                else:
                    keys.append(str(key))

            if int(cursor) == 0:
                break

        return keys


def try_create_redis_cache_from_env() -> RedisCache | None:
    settings = _resolve_redis_connection_settings()
    if not settings.has_configuration:
        return None

    try:
        import redis
    except ImportError:
        return None

    try:
        client = _build_redis_client(redis, settings)
        client.ping()
    except Exception:  # noqa: BLE001
        return None

    return RedisCache(client)


def _resolve_redis_connection_settings() -> RedisConnectionSettings:
    redis_url = _parse_optional_env("REDIS_URL")
    redis_host = _parse_optional_env("REDIS_HOST")
    redis_port = _parse_int_env("REDIS_PORT", default_value=6379)
    redis_db = _parse_int_env("REDIS_DB", default_value=0)
    redis_username = _parse_optional_env("REDIS_USERNAME")
    redis_password = _parse_optional_env("REDIS_PASSWORD")
    redis_ssl = _parse_bool_env("REDIS_SSL", default_value=False)
    timeout_seconds = _parse_float_env("REDIS_TIMEOUT_SECONDS", default_value=0.25)

    return RedisConnectionSettings(
        url=redis_url,
        host=redis_host,
        port=redis_port,
        db=redis_db,
        username=redis_username,
        password=redis_password,
        ssl=redis_ssl,
        timeout_seconds=timeout_seconds,
    )


def _build_redis_client(redis_module: Any, settings: RedisConnectionSettings) -> Any:
    common_kwargs = {
        "decode_responses": True,
        "socket_connect_timeout": settings.timeout_seconds,
        "socket_timeout": settings.timeout_seconds,
    }

    if settings.url is not None:
        return redis_module.Redis.from_url(settings.url, **common_kwargs)

    return redis_module.Redis(
        host=settings.host,
        port=settings.port,
        db=settings.db,
        username=settings.username,
        password=settings.password,
        ssl=settings.ssl,
        **common_kwargs,
    )


def _parse_optional_env(name: str) -> str | None:
    raw_value = os.getenv(name, "").strip()
    return raw_value if len(raw_value) > 0 else None


def _parse_int_env(name: str, default_value: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if len(raw_value) == 0:
        return default_value

    try:
        return int(raw_value)
    except ValueError:
        return default_value


def _parse_float_env(name: str, default_value: float) -> float:
    raw_value = os.getenv(name, "").strip()
    if len(raw_value) == 0:
        return default_value

    try:
        value = float(raw_value)
    except ValueError:
        return default_value

    return value if value > 0 else default_value


def _parse_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if len(raw_value) == 0:
        return default_value

    return raw_value in {"1", "true", "yes", "on"}
