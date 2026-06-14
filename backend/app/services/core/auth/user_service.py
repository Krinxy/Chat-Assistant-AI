from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....models.user import User

# pbkdf2_sha256 is passlib-native — no C extension, works on Python 3.13 + bcrypt 4.x
_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
from ....config import cfg as _cfg  # noqa: E402

_ALGORITHM = "HS256"
_PASSWORD_MIN_LENGTH = _cfg.auth.password_min_length
_RESET_TOKEN_MINUTES = _cfg.auth.reset_token_minutes


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is not set")
    return secret


def _get_iss() -> str:
    return os.getenv("JWT_ISS", "aura-auth")


def _get_aud() -> str:
    return os.getenv("JWT_AUD", "aura-api")


def _hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def _validate_password(password: str) -> None:
    if len(password) < _PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Password must be at least {_PASSWORD_MIN_LENGTH} characters.",
        )


def create_access_token(email: str) -> str:
    expires_minutes = int(os.getenv("JWT_EXPIRES_MINUTES", str(_cfg.auth.access_token_expires_minutes)))
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)
    payload = {
        "iss": _get_iss(),
        "sub": email,
        "aud": _get_aud(),
        "exp": expire,
        "iat": now,
        "nbf": now,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, _get_secret(), algorithm=_ALGORITHM)


async def register_user(email: str, password: str, role: str, db: AsyncSession) -> User:
    _validate_password(password)
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    if role not in ("admin", "user"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Role must be 'admin' or 'user'",
        )
    user = User(email=email, hashed_password=_hash_password(password), role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not _verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def request_password_reset(email: str, db: AsyncSession) -> str:
    """
    Generates a short-lived JWT reset token.
    Always returns a token — never reveals whether the email exists (anti-enumeration).
    In production: send this token via email instead of returning it in the response.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        # Return a dummy token so timing + response are identical for unknown emails
        dummy_expire = datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_MINUTES)
        return jwt.encode(
            {"sub": email, "purpose": "password_reset", "exp": dummy_expire},
            _get_secret(),
            algorithm=_ALGORITHM,
        )
    expire = datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_MINUTES)
    return jwt.encode(
        {"sub": user.email, "purpose": "password_reset", "exp": expire},
        _get_secret(),
        algorithm=_ALGORITHM,
    )


async def reset_password(reset_token: str, new_password: str, db: AsyncSession) -> None:
    _validate_password(new_password)
    invalid_error = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token.",
    )
    try:
        payload = jwt.decode(reset_token, _get_secret(), algorithms=[_ALGORITHM])
        if payload.get("purpose") != "password_reset":
            raise invalid_error
        email: str | None = payload.get("sub")
        if not email:
            raise invalid_error
    except (ExpiredSignatureError, JWTError):
        raise invalid_error

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise invalid_error

    user.hashed_password = _hash_password(new_password)
    await db.commit()
