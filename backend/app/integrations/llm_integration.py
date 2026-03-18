import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).resolve().parents[4] / "config" / "llm_config.yaml"


def _load_config() -> Dict[str, Any]:
    try:
        with open(_CONFIG_PATH, "r") as fh:
            return yaml.safe_load(fh)
    except FileNotFoundError:
        logger.warning("llm_config.yaml not found; using defaults.")
        return {}


class LLMProvider:
    def __init__(self, provider_name: Optional[str] = None):
        self._config = _load_config()
        self._provider_name = provider_name or self._config.get(
            "default_provider", "openai"
        )
        self._provider_cfg = (
            self._config.get("providers", {}).get(self._provider_name) or {}
        )
        self._client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    def _system_prompt(self, domain: str = "default") -> str:
        return (
            self._config.get("system_prompts", {}).get(domain)
            or "You are a helpful AI assistant."
        )

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        domain: str = "default",
        **kwargs,
    ) -> str:
        model = self._provider_cfg.get("model", "gpt-4o-mini")
        temperature = kwargs.pop("temperature", self._provider_cfg.get("temperature", 0.7))
        max_tokens = kwargs.pop("max_tokens", self._provider_cfg.get("max_tokens", 2048))

        full_messages = [
            {"role": "system", "content": self._system_prompt(domain)}
        ] + messages

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=full_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
            return response.choices[0].message.content or ""
        except Exception as exc:
            logger.error("LLM completion failed: %s", exc)
            raise
