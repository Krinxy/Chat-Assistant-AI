import pytest
from unittest.mock import AsyncMock, patch

from app.services.routing_service import RoutingService


@pytest.mark.asyncio
async def test_classify_intent_general():
    service = RoutingService()
    with patch.object(
        service._llm, "chat_completion", new_callable=AsyncMock, return_value="general_chat"
    ):
        intent = await service.classify_intent("How are you?")
    assert intent == "general_chat"


@pytest.mark.asyncio
async def test_classify_intent_weather():
    service = RoutingService()
    with patch.object(
        service._llm, "chat_completion", new_callable=AsyncMock, return_value="weather"
    ):
        intent = await service.classify_intent("What's the weather in Paris?")
    assert intent == "weather"


@pytest.mark.asyncio
async def test_classify_intent_fallback_on_error():
    service = RoutingService()
    with patch.object(
        service._llm,
        "chat_completion",
        new_callable=AsyncMock,
        side_effect=Exception("LLM error"),
    ):
        intent = await service.classify_intent("Hello")
    assert intent == "general_chat"


@pytest.mark.asyncio
async def test_route_returns_agent_name():
    service = RoutingService()
    with patch.object(
        service, "classify_intent", new_callable=AsyncMock, return_value="weather"
    ):
        agent = await service.route("weather query")
    assert agent == "weather_agent"
