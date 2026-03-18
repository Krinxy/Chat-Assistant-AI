import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from main import app
from app.core.dependencies import get_db, get_current_user


def _make_mock_db():
    """Return a mock Motor database."""
    db = MagicMock()
    for col in (
        "users",
        "chat_sessions",
        "chat_messages",
        "user_profiles",
        "behavior_events",
        "notifications",
        "documents",
    ):
        collection = MagicMock()
        collection.find_one = AsyncMock(return_value=None)
        collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id="mock_id")
        )
        collection.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        collection.find = MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
        db.__getitem__ = MagicMock(return_value=collection)
        setattr(db, col, collection)
    return db


MOCK_DB = _make_mock_db()


async def _override_get_db():
    yield MOCK_DB


MOCK_USER = {
    "_id": "test_user_id",
    "email": "test@example.com",
    "username": "testuser",
    "hashed_password": "hashed",
    "is_active": True,
}


async def _override_get_current_user():
    return MOCK_USER


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user():
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPassword123!",
    }
