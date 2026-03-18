import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


MOCK_USER = {
    "_id": "64f0000000000000000000ab",
    "email": "chat@example.com",
    "username": "chatuser",
    "hashed_password": "hashed",
    "is_active": True,
}


@pytest.mark.asyncio
async def test_send_message_unauthorized(client: AsyncClient):
    response = await client.post(
        "/chat/message", json={"message": "Hello"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_session_unauthorized(client: AsyncClient):
    response = await client.post("/chat/session")
    assert response.status_code == 401
