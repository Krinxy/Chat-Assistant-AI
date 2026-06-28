from __future__ import annotations

import inspect
import os
import typing

import pytest

os.environ["AUTH_MODE"] = "mock"
os.environ["MOCK_USER_EMAIL"] = "mock@local"
os.environ["MOCK_USER_ROLE"] = "admin"

from fastapi import Depends  # noqa: E402

from backend.app.models.user import User  # noqa: E402
from backend.app.services.dependency.auth import get_current_user  # noqa: E402
from backend.app.services.dependency.authtoken import authtoken  # noqa: E402


def _param_has_depends(param: inspect.Parameter) -> bool:
    """Return True if the parameter uses Annotated[..., Depends(get_current_user)]."""
    ann = param.annotation
    args = typing.get_args(ann)
    return any(isinstance(a, type(Depends(get_current_user))) for a in args)


def test_authtoken_patches_signature_with_depends() -> None:
    @authtoken
    async def handler(body: str, current_user: User) -> str:
        return current_user.email

    sig = inspect.signature(handler)
    cu_param = sig.parameters["current_user"]
    # Decorator now uses Annotated[User, Depends(get_current_user)] (no .default)
    assert cu_param.default is inspect.Parameter.empty
    assert _param_has_depends(cu_param)


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
    cu_param = sig.parameters["current_user"]
    assert cu_param.default is inspect.Parameter.empty
    assert _param_has_depends(cu_param)


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
