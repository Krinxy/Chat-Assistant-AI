from __future__ import annotations

import os
from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Repo root holds alembic.ini and the migrations/ tree (this file is backend/app/db/session.py).
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Bring the configured database up to the latest schema revision.

    Synchronous by design: Alembic's env.py drives the async engine via ``asyncio.run``,
    so this must be invoked from a worker thread (never inside a running event loop).
    """
    from alembic import command
    from alembic.config import Config

    config = Config(str(_REPO_ROOT / "alembic.ini"))
    command.upgrade(config, "head")


class DatabaseManager:
    _engine = create_async_engine(os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./auth.db"), echo=False)
    _session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(_engine, expire_on_commit=False)

    @staticmethod
    async def init_db() -> None:
        async with DatabaseManager._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    @staticmethod
    async def get_db() -> AsyncIterator[AsyncSession]:
        async with DatabaseManager._session_factory() as session:
            yield session


# module-level aliases — FastAPI Depends and dependency_overrides use object identity
AsyncSessionLocal = DatabaseManager._session_factory
init_db = DatabaseManager.init_db
get_db = DatabaseManager.get_db
