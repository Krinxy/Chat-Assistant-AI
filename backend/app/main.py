from __future__ import annotations

from contextlib import asynccontextmanager
import os
from typing import AsyncIterator

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request, Response  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from starlette.concurrency import run_in_threadpool  # noqa: E402
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint  # noqa: E402

from .api.auth import router as auth_router  # noqa: E402
from .api.chat import router as chat_router  # noqa: E402
from .api.documents import router as documents_router  # noqa: E402
from .db.session import init_db  # noqa: E402
from .services.core.chat.transcription.websocket import router as transcription_router  # noqa: E402
from .services.utils.transcription.preflight import (  # noqa: E402
    print_preflight_report,
    run_transcription_preflight,
)

_BODY_LIMIT_BYTES = 1 * 1024 * 1024  # 1 MB

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "").lower() == "production"


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
        await init_db()
        preload_on_startup = _parse_bool_env("TRANSCRIPTION_PRELOAD_ON_STARTUP", True)
        report = await run_in_threadpool(lambda: run_transcription_preflight(preload_runtime=preload_on_startup))
        print_preflight_report(report)
        yield

    app = FastAPI(
        title="Chat Assistant AI Speech Backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Middleware order is LIFO — last added runs first on requests, last on responses.
    # Security headers run last (outermost) so they're always present regardless of errors.
    app.add_middleware(_SecurityHeadersMiddleware)
    app.add_middleware(_BodySizeLimitMiddleware)

    # CORS: explicit allowlist — wildcard + credentials is a security hole
    _raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175")
    _allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
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
    app.include_router(documents_router, prefix="/api")
    return app


app = create_app()
