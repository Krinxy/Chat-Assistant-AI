from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....models.user import User

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
from ....config import cfg as _cfg  # noqa: E402

_ALGORITHM = "HS256"
_PASSWORD_MIN_LENGTH = _cfg.auth.password_min_length
_RESET_TOKEN_MINUTES = _cfg.auth.reset_token_minutes


class AuthService:
    @staticmethod
    def _get_secret() -> str:
        secret = os.getenv("JWT_SECRET", "")
        if not secret:
            raise RuntimeError("JWT_SECRET environment variable is not set")
        return secret

    @staticmethod
    def _get_iss() -> str:
        return os.getenv("JWT_ISS", "aura-auth")

    @staticmethod
    def _get_aud() -> str:
        return os.getenv("JWT_AUD", "aura-api")

    @staticmethod
    def _hash_password(plain: str) -> str:
        return str(_pwd_context.hash(plain))

    @staticmethod
    def _verify_password(plain: str, hashed: str) -> bool:
        return bool(_pwd_context.verify(plain, hashed))

    @staticmethod
    def _validate_password(password: str) -> None:
        if len(password) < _PASSWORD_MIN_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Password must be at least {_PASSWORD_MIN_LENGTH} characters.",
            )

    @staticmethod
    def create_access_token(email: str) -> str:
        expires_minutes = int(os.getenv("JWT_EXPIRES_MINUTES", str(_cfg.auth.access_token_expires_minutes)))
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=expires_minutes)
        payload = {
            "iss": AuthService._get_iss(),
            "sub": email,
            "aud": AuthService._get_aud(),
            "exp": expire,
            "iat": now,
            "nbf": now,
            "jti": str(uuid.uuid4()),
        }
        return str(jwt.encode(payload, AuthService._get_secret(), algorithm=_ALGORITHM))

    @staticmethod
    async def register_user(email: str, password: str, role: str, db: AsyncSession) -> User:
        AuthService._validate_password(password)
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
        user = User(email=email, hashed_password=AuthService._hash_password(password), role=role)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or not AuthService._verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    @staticmethod
    async def request_password_reset(email: str, db: AsyncSession) -> str:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        expire = datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_MINUTES)
        target_email = user.email if user is not None else email
        return str(
            jwt.encode(
                {"sub": target_email, "purpose": "password_reset", "exp": expire},
                AuthService._get_secret(),
                algorithm=_ALGORITHM,
            )
        )

    @staticmethod
    async def reset_password(reset_token: str, new_password: str, db: AsyncSession) -> None:
        AuthService._validate_password(new_password)
        invalid_error = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )
        try:
            payload = jwt.decode(
                reset_token,
                AuthService._get_secret(),
                algorithms=[_ALGORITHM],
                options={"require_exp": True, "require_sub": True},
            )
            if payload.get("purpose") != "password_reset":
                raise invalid_error
            email: str | None = payload.get("sub")
            if not email:
                raise invalid_error
        except JWTError:
            raise invalid_error

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            raise invalid_error

        user.hashed_password = AuthService._hash_password(new_password)
        await db.commit()


# module-level aliases for backward compat
create_access_token = AuthService.create_access_token
register_user = AuthService.register_user
authenticate_user = AuthService.authenticate_user
request_password_reset = AuthService.request_password_reset
reset_password = AuthService.reset_password
