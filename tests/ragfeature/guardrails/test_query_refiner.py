from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.services.core.guardrails.query_refiner import QueryRefiner
from backend.app.services.dependency.llm import LLMClient, LLMNotConfiguredError

_PROMPT = "Refine the query in the <user_query> block for retrieval."


def _make_refiner(llm_response: str) -> QueryRefiner:
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=llm_response))
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.return_value = mock_llm
    return QueryRefiner(llm_client=mock_client, prompt_template=_PROMPT)


@pytest.mark.asyncio
async def test_refine_returns_refined_text() -> None:
    refiner = _make_refiner("annual revenue figures fiscal year 2024")
    result = await refiner.refine("Can you tell me the revenue last year?", "sess-1")
    assert result == "annual revenue figures fiscal year 2024"


@pytest.mark.asyncio
async def test_refine_returns_original_when_llm_not_configured() -> None:
    original = "What were the sales figures?"
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.side_effect = LLMNotConfiguredError("key missing")
    refiner = QueryRefiner(llm_client=mock_client, prompt_template=_PROMPT)
    result = await refiner.refine(original, "sess-2")
    assert result == original


@pytest.mark.asyncio
async def test_refine_returns_original_on_api_error() -> None:
    original = "How does authentication work?"
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=TimeoutError("timeout"))
    mock_client = MagicMock(spec=LLMClient)
    mock_client.get.return_value = mock_llm
    refiner = QueryRefiner(llm_client=mock_client, prompt_template=_PROMPT)
    result = await refiner.refine(original, "sess-3")
    assert result == original


@pytest.mark.asyncio
async def test_refine_returns_original_when_llm_returns_empty() -> None:
    original = "What is machine learning?"
    refiner = _make_refiner("   ")
    result = await refiner.refine(original, "sess-4")
    assert result == original


@pytest.mark.asyncio
async def test_refine_strips_whitespace() -> None:
    refiner = _make_refiner("  machine learning fundamentals  ")
    result = await refiner.refine("What is ML?", "sess-5")
    assert result == "machine learning fundamentals"


@pytest.mark.asyncio
async def test_from_config_builds_refiner() -> None:
    llm_cfg = {"model": "Qwen3.5-397B-A17B_No_Thinking", "temperature": 0.1}
    refiner = QueryRefiner.from_config(llm_cfg, {})
    assert isinstance(refiner, QueryRefiner)
