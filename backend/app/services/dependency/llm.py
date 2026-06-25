from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

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


@dataclass(frozen=True)
class ProviderSpec:
    """A selectable chat backend, reached generically as ``base_url`` + ``api_key``.

    Every provider speaks the OpenAI wire protocol, so a single ``ChatOpenAI`` factory
    drives all of them — Gemini included, via Google's OpenAI-compatible endpoint
    (``https://generativelanguage.googleapis.com/v1beta/openai``). This keeps one code
    path for every model instead of a separate client per vendor.

    ``api_key_env`` / ``base_url_env`` name the environment variables holding that
    provider's credentials. Both are read at call time so secrets can be supplied via a
    local, git-ignored ``.env`` without rebuilding — and never hard-coded or logged.
    """

    name: str
    api_key_env: str
    base_url_env: str
    default_model: str


# The default model for the local gateway — overridable via backend.yaml. Guardrails
# default to a fast, deterministic No-Thinking model; the chat config overrides this
# with the Thinking variant.
_DEFAULT_MODEL = "qwen3.5-27b-distilled-no-think"

# ── Provider registry — the routing hub ─────────────────────────────────────────
# "local"  → the self-/institution-hosted OpenAI-compatible gateway (e.g. a Qwen
#            deployment). "gemini" → Google Gemini via its OpenAI-compatible endpoint.
# Add a new provider by appending one entry here; no other code path changes.
PROVIDERS: dict[str, ProviderSpec] = {
    "local": ProviderSpec(
        name="local",
        api_key_env="OPENAI_API_KEY",
        base_url_env="OPENAI_BASE_URL",
        default_model=_DEFAULT_MODEL,
    ),
    "gemini": ProviderSpec(
        name="gemini",
        api_key_env="GEMINI_API_KEY",
        base_url_env="GEMINI_BASE_URL",
        default_model="gemini-2.5-flash",
    ),
}

DEFAULT_PROVIDER = "local"


def resolve_provider(provider: str | None) -> ProviderSpec:
    """Return the ProviderSpec for ``provider`` (case-insensitive), falling back to the default.

    Raises:
        LLMNotConfiguredError: if a non-empty provider name is not in the registry.
    """
    name = (provider or DEFAULT_PROVIDER).strip().lower()
    spec = PROVIDERS.get(name)
    if spec is None:
        raise LLMNotConfiguredError(f"Unknown LLM provider: {provider!r}")
    return spec


class LLMClient:
    """Factory for chat-model instances backed by an OpenAI-compatible provider.

    The same client builds against any registered provider (``local`` gateway, ``gemini``,
    …) by reading that provider's ``base_url`` + ``api_key`` from the environment at call
    time — never hard-coded and never logged — so credentials can be injected via a local
    ``.env`` file.

    System messages are sent as genuine ``SystemMessage`` instances (no
    system-to-human conversion) to preserve the trusted/untrusted boundary the
    guardrails' prompt-injection mitigation relies on.
    """

    def __init__(
        self,
        model: str | None = None,
        temperature: float = 0.1,
        streaming: bool = False,
        provider: str = DEFAULT_PROVIDER,
    ) -> None:
        self._spec = resolve_provider(provider)
        self._model = model if model else self._spec.default_model
        self._temperature = temperature
        self._streaming = streaming

    @property
    def model(self) -> str:
        return self._model

    @property
    def provider(self) -> str:
        return self._spec.name

    @staticmethod
    def is_configured(provider: str = DEFAULT_PROVIDER) -> bool:
        """Return True if both of the provider's credentials are present in the environment (no network call)."""
        spec = PROVIDERS.get((provider or DEFAULT_PROVIDER).strip().lower())
        if spec is None:
            return False
        has_key = bool(os.environ.get(spec.api_key_env, "").strip())
        has_url = bool(os.environ.get(spec.base_url_env, "").strip())
        return has_key and has_url

    def get(self) -> ChatOpenAI:
        """Return a ready-to-use ChatOpenAI instance pointed at the provider's endpoint.

        Raises:
            LLMNotConfiguredError: if a credential is missing or the client cannot
                be constructed.
        """
        api_key = os.environ.get(self._spec.api_key_env, "").strip()
        base_url = os.environ.get(self._spec.base_url_env, "").strip()
        if not api_key or not base_url:
            raise LLMNotConfiguredError(f"{self._spec.api_key_env} and {self._spec.base_url_env} must both be set")

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
        provider = str(config.get("provider", DEFAULT_PROVIDER))
        spec = resolve_provider(provider)
        return cls(
            model=str(config.get("model", spec.default_model)),
            temperature=float(config.get("temperature", 0.1)),
            streaming=bool(config.get("streaming", False)),
            provider=spec.name,
        )
