from __future__ import annotations

from contextlib import asynccontextmanager
import os
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from .services.core.chat.transcription.websocket import router as transcription_router
from .services.utils.transcription.preflight import (
    print_preflight_report,
    run_transcription_preflight,
)


def _parse_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if len(raw_value) == 0:
        return default_value

    return raw_value in {"1", "true", "yes", "on"}


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        preload_on_startup = _parse_bool_env("TRANSCRIPTION_PRELOAD_ON_STARTUP", True)
        report = await run_in_threadpool(
            lambda: run_transcription_preflight(preload_runtime=preload_on_startup)
        )
        print_preflight_report(report)
        yield

    app = FastAPI(
        title="Chat Assistant AI Speech Backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(transcription_router)
    return app


app = create_app()
