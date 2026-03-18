import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.orchestrator_service import OrchestratorService


@pytest.mark.asyncio
async def test_process_calls_routing_and_agent():
    db = MagicMock()
    service = OrchestratorService(db)

    with patch.object(
        service._routing, "classify_intent", new_callable=AsyncMock, return_value="general_chat"
    ), patch.object(
        service._routing, "classify_domain", new_callable=AsyncMock, return_value="general"
    ), patch.object(
        service._behavior, "track_event", new_callable=AsyncMock, return_value={}
    ), patch.object(
        service._agent,
        "process",
        new_callable=AsyncMock,
        return_value={
            "session_id": "sess1",
            "message": "Hello back!",
            "role": "assistant",
        },
    ):
        result = await service.process(
            user_id="u1", message="Hello", session_id="sess1"
        )

    assert result["message"] == "Hello back!"
    assert result["session_id"] == "sess1"
