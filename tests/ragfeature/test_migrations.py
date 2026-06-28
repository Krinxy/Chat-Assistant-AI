from __future__ import annotations

import os
import sqlite3

from backend.app.db.session import run_migrations


def test_migrations_build_full_schema_to_head(tmp_path) -> None:
    """`alembic upgrade head` on an empty DB yields the full schema at the latest revision."""
    db_path = tmp_path / "smoke.db"
    prev = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    try:
        run_migrations()
    finally:
        if prev is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = prev

    conn = sqlite3.connect(db_path)
    try:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"users", "chat_sessions", "chat_messages", "documents"} <= tables

        chat_session_cols = {row[1] for row in conn.execute("PRAGMA table_info(chat_sessions)")}
        assert "user_id" in chat_session_cols

        head = {row[0] for row in conn.execute("SELECT version_num FROM alembic_version")}
        assert head == {"bae331af7ba5"}
    finally:
        conn.close()
