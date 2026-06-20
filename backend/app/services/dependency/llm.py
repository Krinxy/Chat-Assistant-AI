from __future__ import annotations

import os
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

# Environment variable names for the OpenAI-compatible gateway credentials.
# Both are read at call time so the secret can be supplied via a local .env
# (git-ignored) without rebuilding or restarting the process.
API_KEY_ENV = "OPENAI_API_KEY"
BASE_URL_ENV = "OPENAI_BASE_URL"

# Non-secret default model — overridable via backend.yaml. Guardrails default to a
# fast, deterministic No-Thinking model; the chat config overrides this with the
# Thinking variant.
_DEFAULT_MODEL = "Qwen3.5-397B-A17B_No_Thinking"

# A hanging gateway must not block the request indefinitely.
_TIMEOUT_SECONDS = 30.0
_MAX_RETRIES = 2


class LLMNotConfiguredError(Exception):
    """Raised when the gateway credentials are missing or the client fails to initialise."""


class LLMUnavailableError(Exception):
    """Raised when the gateway is reachable-in-principle but the call fails transiently.

    Wraps upstream failures (5xx / 502 Bad Gateway, connection errors, timeouts, rate
    limits) so callers can return a clean 503 instead of leaking a raw stack trace.
    """


class LLMClient:
    """Factory for chat-model instances backed by an OpenAI-compatible gateway.

    The model runs behind a self-/institution-hosted OpenAI-compatible endpoint
    (e.g. a Qwen deployment), reached generically via ``base_url`` + ``api_key``.
    Both credentials are read from the environment at call time — never hard-coded
    and never logged — so the key can be injected via a local ``.env`` file.

    System messages are sent as genuine ``SystemMessage`` instances (no
    system-to-human conversion) to preserve the trusted/untrusted boundary the
    guardrails' prompt-injection mitigation relies on.
    """

    def __init__(self, model: str = _DEFAULT_MODEL, temperature: float = 0.1, streaming: bool = False) -> None:
        self._model = model
        self._temperature = temperature
        self._streaming = streaming

    @property
    def model(self) -> str:
        return self._model

    @staticmethod
    def is_configured() -> bool:
        """Return True if both gateway credentials are present in the environment (no network call)."""
        has_key = bool(os.environ.get(API_KEY_ENV, "").strip())
        has_url = bool(os.environ.get(BASE_URL_ENV, "").strip())
        return has_key and has_url

    def get(self) -> ChatOpenAI:
        """Return a ready-to-use ChatOpenAI instance pointed at the gateway.

        Raises:
            LLMNotConfiguredError: if a credential is missing or the client cannot
                be constructed.
        """
        api_key = os.environ.get(API_KEY_ENV, "").strip()
        base_url = os.environ.get(BASE_URL_ENV, "").strip()
        if not api_key or not base_url:
            raise LLMNotConfiguredError(f"{API_KEY_ENV} and {BASE_URL_ENV} must both be set")

        try:
            return ChatOpenAI(
                model=self._model,
                api_key=SecretStr(api_key),
                base_url=base_url,
                temperature=self._temperature,
                streaming=self._streaming,
                timeout=_TIMEOUT_SECONDS,
                max_retries=_MAX_RETRIES,
            )
        except Exception as exc:
            raise LLMNotConfiguredError(f"Failed to initialise LLM client: {exc}") from exc

    @classmethod
    def from_config(cls, config: dict[str, Any]) -> "LLMClient":
        return cls(
            model=str(config.get("model", _DEFAULT_MODEL)),
            temperature=float(config.get("temperature", 0.1)),
            streaming=bool(config.get("streaming", False)),
        )
