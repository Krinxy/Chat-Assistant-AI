"""Create or promote a user to the ``admin`` role.

The public ``POST /api/auth/register`` endpoint always assigns the ``user`` role, but
uploading documents requires ``admin`` (see ``api/documents.py``). This helper bridges that
gap for local testing: it creates the user as admin, or promotes an existing user.

Usage (from the repo root, with the project env active):
    python backend/scripts/create_admin.py admin@example.com "a-strong-password"

Reads DATABASE_URL from .env (defaults to sqlite ./auth.db). The password must satisfy the
configured minimum length. Never run this against a production database.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

# Load .env BEFORE importing db.session: the async engine is built from DATABASE_URL at import.
load_dotenv(find_dotenv())

# Allow `backend.app...` imports when run as a plain script (sys.path[0] would be backend/scripts).
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select  # noqa: E402

from backend.app.db.session import AsyncSessionLocal, run_migrations  # noqa: E402
from backend.app.models.user import User  # noqa: E402
from backend.app.services.core.auth.user_service import register_user  # noqa: E402


async def _create_or_promote(email: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing is not None:
            if existing.role == "admin":
                print(f"User {email!r} is already an admin (id={existing.id}).")
                return
            existing.role = "admin"
            await db.commit()
            print(f"Promoted existing user {email!r} to admin (id={existing.id}).")
            return
        user = await register_user(email, password, "admin", db)
        print(f"Created admin user {email!r} (id={user.id}).")


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python backend/scripts/create_admin.py <email> <password>", file=sys.stderr)
        raise SystemExit(2)

    email, password = sys.argv[1], sys.argv[2]
    # Ensure the schema exists (Alembic owns it). Sync call — must run outside an event loop.
    run_migrations()
    asyncio.run(_create_or_promote(email, password))


if __name__ == "__main__":
    main()
