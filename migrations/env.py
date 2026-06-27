"""Alembic migration environment (async SQLAlchemy + SQLite batch mode).

The target metadata is the application's declarative ``Base``. All model modules are
imported explicitly so every table is registered before autogenerate compares the
schema. The database URL comes from ``DATABASE_URL`` (same default as the app).
"""
from __future__ import annotations

import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Ensure the repo root is importable regardless of the current working directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.db.session import Base  # noqa: E402

# Import every model module so its table is attached to Base.metadata.
from backend.app.models import document, message, session, user  # noqa: E402,F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL wins over any value in the ini; mirrors the application default.
_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./auth.db")
config.set_main_option("sqlalchemy.url", _DATABASE_URL)

target_metadata = Base.metadata


def _configure(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # SQLite cannot ALTER most things in place — emulate via table copy/rename.
        render_as_batch=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a live DB connection (``alembic upgrade --sql``)."""
    context.configure(
        url=_DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations against a live async connection."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(_configure)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
