from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import Depends, HTTPException, WebSocketException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_db
from ...models.user import User

_ALGORITHM = "HS256"
# auto_error=False so mock mode works without an Authorization header
_bearer_scheme = HTTPBearer(auto_error=False)


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is not set")
    return secret


def _get_iss() -> str:
    return os.getenv("JWT_ISS", "aura-auth")


def _get_aud() -> str:
    return os.getenv("JWT_AUD", "aura-api")


def verify_ws_token(token: str | None) -> None:
    """
    Stateless JWT validation for WebSocket auth (no DB lookup).
    Raises WebSocketException(1008) on missing or invalid token.
    In AUTH_MODE=mock the caller should skip this check entirely.
    """
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    try:
        payload = jwt.decode(
            token,
            _get_secret(),
            algorithms=[_ALGORITHM],
            audience=_get_aud(),
            issuer=_get_iss(),
        )
        if payload.get("sub") is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    except JWTError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)


class AbstractAuthProvider(ABC):
    """
    SSO Extension Point: swap JWTAuthProvider with an OAuthProvider that implements
    this interface. Route logic never changes — only the _provider binding below.
    """

    @abstractmethod
    async def get_current_user(self, token: str, db: AsyncSession) -> User: ...


class JWTAuthProvider(AbstractAuthProvider):
    async def get_current_user(self, token: str, db: AsyncSession) -> User:
        credentials_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        expired_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(
                token,
                _get_secret(),
                algorithms=[_ALGORITHM],
                audience=_get_aud(),
                issuer=_get_iss(),
            )
            email: str | None = payload.get("sub")
            if email is None:
                raise credentials_error
        except ExpiredSignatureError:
            raise expired_error
        except JWTError:
            raise credentials_error

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            raise credentials_error
        return user


class MockAuthProvider(AbstractAuthProvider):
    """
    Development / test provider — activated when AUTH_MODE=mock.
    Skips all JWT validation and returns a fixed in-memory user.
    Configure via MOCK_USER_EMAIL and MOCK_USER_ROLE env vars.
    Never use in production.
    """

    async def get_current_user(self, token: str, db: AsyncSession) -> User:
        return User(
            email=os.getenv("MOCK_USER_EMAIL", "mock@local"),
            hashed_password="",
            role=os.getenv("MOCK_USER_ROLE", "admin"),
        )


_jwt_provider = JWTAuthProvider()
_mock_provider = MockAuthProvider()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    # Read AUTH_MODE per-request so tests can switch modes between fixtures
    if os.getenv("AUTH_MODE", "").lower() == "mock":
        return await _mock_provider.get_current_user("", db)
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _jwt_provider.get_current_user(credentials.credentials, db)


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user
