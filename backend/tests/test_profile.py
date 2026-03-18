import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_profile_unauthorized(client: AsyncClient):
    response = await client.get("/profile")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_profile_unauthorized(client: AsyncClient):
    response = await client.put("/profile", json={"interests": ["tech"]})
    assert response.status_code == 401
