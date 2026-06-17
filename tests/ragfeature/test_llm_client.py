from __future__ import annotations

import os
from typing import Any
from unittest.mock import patch

import pytest

from backend.app.services.dependency.llm import LLMClient, LLMNotConfiguredError

_ENV = {"OPENAI_API_KEY": "k", "OPENAI_BASE_URL": "https://gw.example/v1"}


def test_is_configured_false_when_missing() -> None:
    with patch.dict(os.environ, {}, clear=True):
        assert LLMClient.is_configured() is False


def test_is_configured_true_when_both_present() -> None:
    with patch.dict(os.environ, _ENV, clear=True):
        assert LLMClient.is_configured() is True


def test_is_configured_false_when_only_key_present() -> None:
    with patch.dict(os.environ, {"OPENAI_API_KEY": "k"}, clear=True):
        assert LLMClient.is_configured() is False


def test_get_raises_when_unconfigured() -> None:
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(LLMNotConfiguredError, match="must both be set"):
            LLMClient().get()


def test_get_builds_client_with_gateway_params() -> None:
    captured: dict[str, Any] = {}

    def _fake_ctor(**kwargs: Any) -> str:
        captured.update(kwargs)
        return "client-sentinel"

    with patch.dict(os.environ, _ENV, clear=True):
        with patch("backend.app.services.dependency.llm.ChatOpenAI", side_effect=_fake_ctor):
            result = LLMClient(model="qwen3.5-think", temperature=0.5, streaming=True).get()

    assert result == "client-sentinel"
    assert captured["model"] == "qwen3.5-think"
    assert captured["base_url"] == "https://gw.example/v1"
    # api_key is wrapped in pydantic SecretStr so it never appears in logs/reprs.
    assert captured["api_key"].get_secret_value() == "k"
    assert captured["temperature"] == 0.5
    assert captured["streaming"] is True


def test_from_config_reads_fields() -> None:
    client = LLMClient.from_config({"model": "qwen3.5-think", "temperature": 0.7, "streaming": True})
    assert client.model == "qwen3.5-think"
    assert client._temperature == 0.7
    assert client._streaming is True


def test_from_config_uses_defaults() -> None:
    client = LLMClient.from_config({})
    assert client.model == "Qwen3.5-397B-A17B_No_Thinking"
    assert client._streaming is False
