from __future__ import annotations

import inspect
import os

import pytest

os.environ["AUTH_MODE"] = "mock"
os.environ["MOCK_USER_EMAIL"] = "mock@local"
os.environ["MOCK_USER_ROLE"] = "admin"

from fastapi import Depends  # noqa: E402

from backend.app.models.user import User  # noqa: E402
from backend.app.services.dependency.auth import get_current_user  # noqa: E402
from backend.app.services.dependency.authtoken import authtoken  # noqa: E402


def test_authtoken_patches_signature_with_depends() -> None:
    @authtoken
    async def handler(body: str, current_user: User) -> str:
        return current_user.email

    sig = inspect.signature(handler)
    cu_param = sig.parameters["current_user"]
    assert cu_param.default == Depends(get_current_user)


def test_authtoken_requires_current_user_param() -> None:
    with pytest.raises(TypeError, match="current_user"):

        @authtoken
        async def bad_handler(body: str) -> str:
            return body


def test_authtoken_with_role_kwarg_patches_signature() -> None:
    @authtoken(role="admin")
    async def admin_handler(current_user: User) -> str:
        return current_user.email

    sig = inspect.signature(admin_handler)
    assert "current_user" in sig.parameters
    assert sig.parameters["current_user"].default == Depends(get_current_user)


@pytest.mark.asyncio
async def test_authtoken_role_check_raises_403_for_wrong_role() -> None:
    from fastapi import HTTPException

    @authtoken(role="admin")
    async def admin_only(current_user: User) -> str:
        return "ok"

    user = User(email="u@test.com", hashed_password="", role="user")

    with pytest.raises(HTTPException) as exc_info:
        await admin_only(current_user=user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_authtoken_role_check_passes_for_correct_role() -> None:
    @authtoken(role="admin")
    async def admin_only(current_user: User) -> str:
        return "ok"

    admin = User(email="a@test.com", hashed_password="", role="admin")
    result = await admin_only(current_user=admin)
    assert result == "ok"
