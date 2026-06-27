from __future__ import annotations

import dataclasses
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

import yaml

_CONFIG_PATH = Path(__file__).parent.parent / "config" / "backend.yaml"


def _section(cls, raw: dict, key: str):
    """Instantiate a dataclass from a YAML section, ignoring unknown keys."""
    data = raw.get(key) or {}
    known = {f.name for f in dataclasses.fields(cls)}
    return cls(**{k: v for k, v in data.items() if k in known})


@dataclass
class AuthConfig:
    password_min_length: int = 8
    reset_token_minutes: int = 15
    access_token_expires_minutes: int = 15


@dataclass
class RateLimitConfig:
    login_max_attempts: int = 5
    login_window_seconds: int = 60
    forgot_password_max_attempts: int = 3
    forgot_password_window_seconds: int = 600
    reset_password_max_attempts: int = 5
    reset_password_window_seconds: int = 60


@dataclass
class ApiConfig:
    body_limit_bytes: int = 1_048_576
    max_upload_bytes: int = 20 * 1024 * 1024
    hsts_max_age_seconds: int = 31_536_000
    max_audio_chunk_bytes: int = 10 * 1024 * 1024
    ws_auth_timeout_seconds: float = 10.0
    allowed_origins: List[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
        ]
    )


@dataclass
class TranscriptionConfig:
    speech_cache_ttl_seconds: int = 20
    receive_poll_ms: int = 120
    receive_poll_ms_min: int = 40
    receive_poll_ms_max: int = 1000
    max_inflight_chunks_min: int = 1
    max_inflight_chunks_max: int = 8
    whisper_model: str = "openai/whisper-large-v3-turbo"
    whisper_model_revision: str = "main"
    sampling_rate: int = 16000


@dataclass
class VectorDbConfig:
    persist_path: str = "./chroma_db"
    collection_name: str = "documents"
    distance_metric: str = "cosine"


@dataclass
class RedisConfig:
    port: int = 6379
    db: int = 0
    timeout_seconds: float = 0.25
    scan_count: int = 100


@dataclass
class AppConfig:
    auth: AuthConfig = field(default_factory=AuthConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    api: ApiConfig = field(default_factory=ApiConfig)
    transcription: TranscriptionConfig = field(default_factory=TranscriptionConfig)
    vector_db: VectorDbConfig = field(default_factory=VectorDbConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)


def _load() -> AppConfig:
    if not _CONFIG_PATH.exists():
        return AppConfig()
    with open(_CONFIG_PATH, encoding="utf-8") as fh:
        raw: dict = yaml.safe_load(fh) or {}

    api_raw = raw.get("api") or {}
    api_known = {f.name for f in dataclasses.fields(ApiConfig)}
    api_kwargs = {k: v for k, v in api_raw.items() if k in api_known}
    # ALLOWED_ORIGINS env var takes precedence over YAML (deployment flexibility)
    env_origins = os.getenv("ALLOWED_ORIGINS", "")
    if env_origins.strip():
        api_kwargs["allowed_origins"] = [o.strip() for o in env_origins.split(",") if o.strip()]

    # CHROMA_PATH env var takes precedence over YAML for operational flexibility
    vectordb_raw = dict(raw.get("vectordb") or {})
    chroma_path = os.getenv("CHROMA_PATH", "").strip()
    if chroma_path:
        vectordb_raw["persist_path"] = chroma_path
    vectordb_known = {f.name for f in dataclasses.fields(VectorDbConfig)}
    vectordb_kwargs = {k: v for k, v in vectordb_raw.items() if k in vectordb_known}

    return AppConfig(
        auth=_section(AuthConfig, raw, "auth"),
        rate_limit=_section(RateLimitConfig, raw, "rate_limit"),
        api=ApiConfig(**api_kwargs) if api_kwargs else ApiConfig(),
        transcription=_section(TranscriptionConfig, raw, "transcription"),
        vector_db=VectorDbConfig(**vectordb_kwargs) if vectordb_kwargs else VectorDbConfig(),
        redis=_section(RedisConfig, raw, "redis"),
    )


cfg = _load()
IS_PRODUCTION = os.getenv("ENVIRONMENT", "").lower() == "production"
