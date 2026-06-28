from __future__ import annotations

import functools
import inspect
from collections.abc import Callable
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status

from ...models.user import User
from .auth import get_current_user


def authtoken(_func: Callable[..., Any] | None = None, *, role: str | None = None) -> Any:
    """
    Decorator that injects the authenticated user into a FastAPI route.

    Usage:
        @router.get("/me")
        @authtoken
        async def me(current_user: User) -> ...:
            ...

        @router.delete("/{id}")
        @authtoken(role="admin")
        async def delete(id: str, current_user: User) -> ...:
            ...

    The `current_user` parameter must be present in the decorated function's
    signature — the decorator wires the FastAPI Depends() onto it so the route
    handler receives a fully resolved User without any Depends() boilerplate
    in the call site.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        sig = inspect.signature(func)
        params = list(sig.parameters.values())

        # Replace the bare `current_user: User` param with an Annotated[User, Depends()]
        # annotation (no default). This avoids the "non-default argument follows default
        # argument" error when the other route params also use Annotated[…, Depends()] style.
        _annotated_user = Annotated[User, Depends(get_current_user)]
        new_params: list[inspect.Parameter] = []
        injected = False
        for p in params:
            if p.name == "current_user":
                new_params.append(p.replace(annotation=_annotated_user, default=inspect.Parameter.empty))
                injected = True
            else:
                new_params.append(p)

        if not injected:
            raise TypeError(f"@authtoken: '{func.__name__}' must declare a 'current_user' parameter")

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            current_user: User = kwargs.get("current_user")  # type: ignore[assignment]
            if role is not None and current_user.role != role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{role}' required",
                )
            return await func(*args, **kwargs)

        # Patch the signature so FastAPI introspects Depends() at startup
        wrapper.__signature__ = sig.replace(parameters=new_params)  # type: ignore[attr-defined]
        return wrapper

    # Support both @authtoken and @authtoken(role="admin")
    if _func is not None:
        return decorator(_func)
    return decorator
