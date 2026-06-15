from __future__ import annotations

import os
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI


class LLMNotConfiguredError(Exception):
    """Raised when GEMINI_API_KEY is not set in the environment."""


class LLMClient:
    """Factory for Gemini LLM instances via langchain-google-genai.

    Reads GEMINI_API_KEY from the environment at call time so the key can be
    injected via .env without restarting the process. SystemMessage is sent
    as a genuine system instruction (convert_system_message_to_human is NOT set)
    to preserve the trusted/untrusted boundary required for prompt injection mitigation.
    """

    def __init__(self, model: str = "gemini-2.0-flash", temperature: float = 0.1) -> None:
        self._model = model
        self._temperature = temperature

    @property
    def model(self) -> str:
        return self._model

    def get(self) -> Any:
        """Return a ready-to-use ChatGoogleGenerativeAI instance.

        Raises:
            LLMNotConfiguredError: if GEMINI_API_KEY is missing from the environment.
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise LLMNotConfiguredError("GEMINI_API_KEY not set")

        return ChatGoogleGenerativeAI(
            model=self._model,
            google_api_key=api_key,
            temperature=self._temperature,
        )

    @classmethod
    def from_config(cls, config: dict[str, Any]) -> "LLMClient":
        return cls(
            model=str(config.get("model", "gemini-2.0-flash")),
            temperature=float(config.get("temperature", 0.1)),
        )
