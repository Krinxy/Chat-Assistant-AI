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
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware  # noqa: E402

from .config import cfg, IS_PRODUCTION  # noqa: E402
from .api.auth import router as auth_router  # noqa: E402
from .api.chat import initialize as initialize_chat  # noqa: E402
from .api.chat import router as chat_router  # noqa: E402
from .api.config import router as config_router  # noqa: E402
from .api.documents import router as documents_router  # noqa: E402
from .api.sessions import router as sessions_router  # noqa: E402
from .db.session import init_db  # noqa: E402
from .services.core.chat.transcription.websocket import router as transcription_router  # noqa: E402
from .services.dependency.llm import LLMClient  # noqa: E402
from .services.utils.transcription.preflight import (  # noqa: E402
    print_preflight_report,
    run_transcription_preflight,
)

_logger = logging.getLogger(__name__)

_BODY_LIMIT_BYTES = cfg.api.body_limit_bytes
# Document uploads are allowed up to max_upload_bytes; the global limit is enforced in-endpoint.
_BODY_LIMIT_EXEMPT_PATHS = {"/api/documents/upload"}


def _ensure_jwt_secret() -> None:
    """Validate JWT_SECRET is present; in dev generate a temporary one with a loud warning."""
    if os.getenv("JWT_SECRET", "").strip():
        return
    if IS_PRODUCTION:
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
        if request.url.path in _BODY_LIMIT_EXEMPT_PATHS:
            return await call_next(request)
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
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = f"max-age={cfg.api.hsts_max_age_seconds}; includeSubDomains"
        return response


def _parse_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if len(raw_value) == 0:
        return default_value

    return raw_value in {"1", "true", "yes", "on"}


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if IS_PRODUCTION and os.getenv("AUTH_MODE", "").lower() == "mock":
            raise RuntimeError(
                "AUTH_MODE=mock must not run in production (ENVIRONMENT=production). Set AUTH_MODE=jwt and provide a real JWT_SECRET."
            )
        _ensure_jwt_secret()
        await init_db()
        initialize_chat(_app)
        preload_on_startup = _parse_bool_env("TRANSCRIPTION_PRELOAD_ON_STARTUP", True)
        report = await run_in_threadpool(lambda: run_transcription_preflight(preload_runtime=preload_on_startup))
        print_preflight_report(report)
        yield

    app = FastAPI(
        title="Chat Assistant AI Speech Backend",
        version="0.1.0",
        lifespan=lifespan,
        # Disable API docs in production — avoids endpoint disclosure on public servers.
        # Set ENVIRONMENT=production to enable this. Override TRUSTED_PROXY_IPS for Hetzner.
        docs_url=None if IS_PRODUCTION else "/docs",
        redoc_url=None if IS_PRODUCTION else "/redoc",
        openapi_url=None if IS_PRODUCTION else "/openapi.json",
    )

    # Trust X-Forwarded-For from the reverse proxy (nginx on Hetzner).
    # Set TRUSTED_PROXY_IPS env var to the proxy's IP (comma-separated) in production.
    # Defaults to 127.0.0.1 (nginx on same host). In dev, no proxy headers are present
    # so this middleware is effectively a no-op.
    _trusted_proxy_ips = os.getenv("TRUSTED_PROXY_IPS", "127.0.0.1")
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=_trusted_proxy_ips)

    # Unhandled exceptions bypass CORSMiddleware (ServerErrorMiddleware is outermost).
    # This handler re-attaches the CORS header so the browser sees the real status
    # code instead of a network-level "failed to fetch".
    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        _logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        origin = request.headers.get("origin", "")
        headers: dict[str, str] = {}
        if origin in cfg.api.allowed_origins:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(status_code=500, content={"detail": "Internal server error"}, headers=headers)

    # Middleware order is LIFO — last added runs first on requests, last on responses.
    # Security headers run last (outermost) so they're always present regardless of errors.
    app.add_middleware(_SecurityHeadersMiddleware)
    app.add_middleware(_BodySizeLimitMiddleware)

    # CORS: explicit allowlist — wildcard + credentials is a security hole
    # env var ALLOWED_ORIGINS takes precedence over YAML defaults (see config.py)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.api.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        # LLM status reflects whether the gateway credentials are present in the
        # environment — no inference call is made, so /health stays fast and free.
        return {"status": "ok", "llm": "configured" if LLMClient.is_configured() else "not_configured"}

    app.include_router(transcription_router)
    app.include_router(auth_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(sessions_router, prefix="/api")
    app.include_router(documents_router, prefix="/api")
    app.include_router(config_router, prefix="/api")
    return app


app = create_app()
