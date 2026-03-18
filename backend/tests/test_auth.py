import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, sample_user):
    with patch(
        "app.repositories.user_repository.UserRepository.get_by_email",
        new_callable=AsyncMock,
        return_value=None,
    ), patch(
        "app.repositories.user_repository.UserRepository.get_by_username",
        new_callable=AsyncMock,
        return_value=None,
    ), patch(
        "app.repositories.user_repository.UserRepository.create",
        new_callable=AsyncMock,
        return_value={
            "_id": "64f0000000000000000000aa",
            "email": sample_user["email"],
            "username": sample_user["username"],
            "created_at": "2024-01-01T00:00:00",
            "is_active": True,
        },
    ):
        response = await client.post("/auth/register", json=sample_user)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == sample_user["email"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, sample_user):
    existing_user = {
        "_id": "64f0000000000000000000aa",
        "email": sample_user["email"],
        "username": sample_user["username"],
        "hashed_password": "hashed",
        "created_at": "2024-01-01T00:00:00",
        "is_active": True,
    }
    with patch(
        "app.repositories.user_repository.UserRepository.get_by_email",
        new_callable=AsyncMock,
        return_value=existing_user,
    ):
        response = await client.post("/auth/register", json=sample_user)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, sample_user):
    with patch(
        "app.repositories.user_repository.UserRepository.get_by_email",
        new_callable=AsyncMock,
        return_value=None,
    ):
        response = await client.post(
            "/auth/login",
            json={"email": sample_user["email"], "password": "wrongpass"},
        )
    assert response.status_code == 401
