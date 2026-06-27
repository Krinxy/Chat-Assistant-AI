from __future__ import annotations

from dataclasses import dataclass, field
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.user import User
from ..services.core.auth.user_service import (
    authenticate_user,
    create_access_token,
    register_user,
    request_password_reset,
    reset_password,
)
from ..config import cfg as _cfg, IS_PRODUCTION
from ..services.dependency.auth import get_current_user
from ..services.dependency.ratelimit import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


@dataclass
class RegisterRequest:
    email: str
    password: str
    # role is intentionally NOT accepted from the client — always "user"


@dataclass
class RegisterResponse:
    id: int
    email: str


@dataclass
class LoginRequest:
    email: str
    password: str


@dataclass
class TokenResponse:
    access_token: str
    token_type: str = field(default="bearer")


@dataclass
class ForgotPasswordRequest:
    email: str


@dataclass
class ForgotPasswordResponse:
    message: str = field(default="If this email exists, a reset link has been sent.")
    # Returned only outside production — use to test the reset flow without an email service.
    reset_token: str | None = field(default=None)


@dataclass
class ResetPasswordRequest:
    reset_token: str
    new_password: str


@dataclass
class ResetPasswordResponse:
    message: str = field(default="Password updated successfully.")


@dataclass
class MeResponse:
    email: str
    role: str


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    user = await register_user(body.email, body.password, "user", db)
    return RegisterResponse(id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    check_rate_limit(request, limit=_cfg.rate_limit.login_max_attempts, window=_cfg.rate_limit.login_window_seconds)
    user = await authenticate_user(body.email, body.password, db)
    token = create_access_token(user.email)
    return TokenResponse(access_token=token)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForgotPasswordResponse:
    check_rate_limit(request, limit=_cfg.rate_limit.forgot_password_max_attempts, window=_cfg.rate_limit.forgot_password_window_seconds)
    token = await request_password_reset(body.email, db)
    return ForgotPasswordResponse(reset_token=None if IS_PRODUCTION else token)


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> MeResponse:
    """Validates the Bearer token and returns the authenticated user's identity.
    Returns 401 if the token is missing, expired, or tampered with."""
    return MeResponse(email=current_user.email, role=current_user.role)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password_endpoint(
    request: Request,
    body: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ResetPasswordResponse:
    check_rate_limit(request, limit=_cfg.rate_limit.reset_password_max_attempts, window=_cfg.rate_limit.reset_password_window_seconds)
    await reset_password(body.reset_token, body.new_password, db)
    return ResetPasswordResponse()
