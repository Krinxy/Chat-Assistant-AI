from __future__ import annotations

import logging
import os
import secrets
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import find_dotenv, load_dotenv

# find_dotenv(usecwd=True) traverses upward from the process cwd so the root
# .env is found regardless of which subdirectory uvicorn is launched from.
load_dotenv(find_dotenv(usecwd=True, raise_error_if_not_found=False))

from fastapi import FastAPI, Request, Response  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from starlette.concurrency import run_in_threadpool  # noqa: E402
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint  # noqa: E402

from .api.auth import router as auth_router  # noqa: E402
from .api.chat import initialize as initialize_chat  # noqa: E402
from .api.chat import router as chat_router  # noqa: E402
from .api.documents import router as documents_router  # noqa: E402
from .api.sessions import router as sessions_router  # noqa: E402
from .db.session import init_db  # noqa: E402
from .services.core.chat.transcription.websocket import router as transcription_router  # noqa: E402
from .services.utils.transcription.preflight import (  # noqa: E402
    print_preflight_report,
    run_transcription_preflight,
)

_logger = logging.getLogger(__name__)

_BODY_LIMIT_BYTES = 1 * 1024 * 1024  # 1 MB

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "").lower() == "production"


def _ensure_jwt_secret() -> None:
    """Validate JWT_SECRET is present; in dev generate a temporary one with a loud warning."""
    if os.getenv("JWT_SECRET", "").strip():
        return
    if _IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET environment variable is not set. Set a strong random secret before deploying.")
    tmp = secrets.token_hex(64)
    os.environ["JWT_SECRET"] = tmp
    _logger.warning(
        "JWT_SECRET is not set — generated a temporary dev secret. "
        "Tokens will be invalidated on the next restart. "
        "Add JWT_SECRET to your .env file to persist sessions."
    )


class _BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        cl = request.headers.get("content-length")
        if cl and int(cl) > _BODY_LIMIT_BYTES:
            return Response(
                content='{"detail":"Request body too large (max 1 MB)"}',
                status_code=413,
                media_type="application/json",
            )
        return await call_next(request)


class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if _IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def _parse_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if len(raw_value) == 0:
        return default_value

    return raw_value in {"1", "true", "yes", "on"}


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if _IS_PRODUCTION and os.getenv("AUTH_MODE", "").lower() == "mock":
            raise RuntimeError(
                "AUTH_MODE=mock must not run in production (ENVIRONMENT=production). " "Set AUTH_MODE=jwt and provide a real JWT_SECRET."
            )
        _ensure_jwt_secret()
        await init_db()
        initialize_chat(_app)
        preload_on_startup = _parse_bool_env("TRANSCRIPTION_PRELOAD_ON_STARTUP", True)
        report = await run_in_threadpool(lambda: run_transcription_preflight(preload_runtime=preload_on_startup))
        print_preflight_report(report)
        yield

    _raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175")
    _allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

    app = FastAPI(
        title="Chat Assistant AI Speech Backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Unhandled exceptions bypass CORSMiddleware (ServerErrorMiddleware is outermost).
    # This handler re-attaches the CORS header so the browser sees the real status
    # code instead of a network-level "failed to fetch".
    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        _logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        origin = request.headers.get("origin", "")
        headers = {}
        if origin in _allowed_origins:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(status_code=500, content={"detail": "Internal server error"}, headers=headers)

    # Middleware order is LIFO — last added runs first on requests, last on responses.
    # Security headers run last (outermost) so they're always present regardless of errors.
    app.add_middleware(_SecurityHeadersMiddleware)
    app.add_middleware(_BodySizeLimitMiddleware)

    # CORS: explicit allowlist — wildcard + credentials is a security hole
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(transcription_router)
    app.include_router(auth_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(sessions_router, prefix="/api")
    app.include_router(documents_router, prefix="/api")
    return app


app = create_app()
