---
description: JWT auth and API-first deployment for the AURA backend - milestone by milestone with confirmation at each step
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /security — JWT Auth + API Deployment

You are working on the AURA backend, which is built as a **standalone REST API** intended for separate deployment (Hetzner server for the backend, static hosting for the frontend). Work through exactly **one milestone at a time**, then pause and ask the user to confirm before moving on.

## How to execute this skill

1. **Detect state** — check which milestones are already done by looking for the key files listed under each milestone.
2. **Show status** — print a checklist of all milestones, marking which are ✅ done and which are ⏳ pending.
3. **Implement the next pending milestone** — write all files completely.
4. **Ask for confirmation** — after implementing, show what was created/changed and ask: "Milestone X abgeschlossen. Weiter mit Milestone Y?" before proceeding.

Never skip a milestone. Never implement more than one milestone per turn unless the user explicitly says "alle auf einmal" or "skip confirmations".

---

## Architecture Overview

```
┌──────────────────────────────────┐   ┌─────────────────────────────────────┐
│  frontend/                       │   │  backend/                            │
│  ─────────────────────────────── │   │  ──────────────────────────────────  │
│  Vite + React (static build)     │   │  FastAPI REST API + WebSocket        │
│  Deployed to: CDN / Netlify /    │   │  Deployed to: Hetzner (uvicorn)     │
│              static host         │   │                                      │
│                                  │   │  Endpoints:                          │
│  Config: frontend/config/        │   │  POST /api/auth/register             │
│          frontend.yaml           │   │  POST /api/auth/login                │
│                                  │   │  GET  /api/auth/me                   │
│  Env vars (at build time):       │   │  POST /api/chat          (JWT)       │
│  VITE_API_URL=https://api.…      │   │  GET  /api/documents     (JWT)       │
│  VITE_TRANSCRIPTION_WS_URL=wss…  │   │  POST /api/documents     (admin)     │
│                                  │   │  DELETE /api/documents/:id (admin)   │
└────────────┬─────────────────────┘   │  WS /ws/transcribe                   │
             │  HTTPS + WSS            │                                      │
             └────────────────────────▶│  Config: backend/config/backend.yaml │
                                       │  Auth: JWT (HS256, 15 min TTL)       │
                                       └─────────────────────────────────────┘
```

---

## Backend as a Deployable Unit

The backend is self-contained inside `backend/`. To deploy to Hetzner:

```bash
# On Hetzner server — install deps and run
cd /app/backend
pip install -e ".[backend]"

# Required env vars
export JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(64))")
export JWT_ISS=aura-auth
export JWT_AUD=aura-api
export JWT_EXPIRES_MINUTES=15
export AUTH_MODE=jwt
export ENVIRONMENT=production
export ALLOWED_ORIGINS=https://your-frontend-domain.com
export DATABASE_URL=sqlite+aiosqlite:///./auth.db   # or PostgreSQL in prod

uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Frontend `frontend/config/frontend.yaml` is bundled at build time — no runtime dependency on the backend config.
Frontend `backend/config/backend.yaml` is read at startup — included in the backend deployment.

---

## Target Backend Structure (FSD-compliant)

```
backend/
├── config/
│   └── backend.yaml           ← operational config (auth, rate limits, CORS, etc.)
└── app/
    ├── api/
    │   ├── __init__.py
    │   ├── auth.py            ← M4: POST /api/auth/register + /login + /me
    │   ├── chat.py            ← M5: POST /api/chat (stub, JWT-protected)
    │   └── documents.py       ← M5: GET|POST|DELETE /api/documents (stubs)
    ├── config.py              ← reads backend/config/backend.yaml
    ├── db/
    │   ├── __init__.py
    │   └── session.py         ← M2: SQLAlchemy async engine + init_db()
    ├── models/
    │   ├── __init__.py
    │   └── user.py            ← M2: User ORM model
    ├── services/
    │   ├── core/auth/
    │   │   ├── __init__.py
    │   │   └── user_service.py  ← M4: register, authenticate, create_access_token
    │   └── dependency/
    │       └── auth.py          ← M3: JWTAuthProvider, get_current_user, require_admin
    └── main.py                  ← M6: CORS, routers, lifespan

tests/auth/
├── __init__.py
├── conftest.py                  ← M8: in-memory SQLite fixture
├── test_auth_endpoints.py       ← M8
├── test_auth_service.py         ← M8
└── test_jwt_dependency.py       ← M8
```

---

## Milestone Definitions

### M1 — Dependencies ✅ (detect: `python-jose` in pyproject.toml)
Add to `pyproject.toml` under `[project.optional-dependencies] backend`:
```
"python-jose[cryptography]>=3.3.0",
"passlib[bcrypt]>=1.7.4",
"sqlalchemy>=2.0.0",
"aiosqlite>=0.20.0",
```

---

### M2 — Database Layer + User Model ✅ (detect: `backend/app/db/session.py`)

**`backend/app/db/session.py`:**
```python
from __future__ import annotations

import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./auth.db")
_engine = create_async_engine(_DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False)


async def init_db() -> None:
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
```

**`backend/app/models/user.py`:**
```python
from __future__ import annotations

import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="user", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

---

### M3 — JWT Auth Dependency + SSO Extension Point ✅ (detect: `AbstractAuthProvider` in `backend/app/services/dependency/auth.py`)

The `JWTAuthProvider` validates:
- HS256 algorithm (explicit whitelist — blocks `alg:none` attacks)
- `iss` + `aud` claims matching `JWT_ISS` / `JWT_AUD` env vars
- `jti` (unique token ID), `nbf` (not before), `iat` (issued at)
- Token TTL: 15 minutes (configured via `JWT_EXPIRES_MINUTES`)

**SSO Extension Point:** Replace `_provider: AbstractAuthProvider = JWTAuthProvider()` with any class implementing `AbstractAuthProvider.get_current_user(token, db) -> User`. Route code never changes.

---

### M4 — Auth Endpoints + User Service ✅ (detect: `backend/app/api/auth.py`)

Endpoints:
- `POST /api/auth/register` → 201 `{id, email}`
- `POST /api/auth/login` → 200 `{access_token, token_type}`
- `GET /api/auth/me` → 200 `{email, role}` (requires Bearer token)

Rate limiting applied per-IP (configurable in `backend/config/backend.yaml`).

---

### M5 — Stub Routes (Chat + Documents) ✅ (detect: `backend/app/api/chat.py`)

Stubs that enforce auth now so the auth layer is exercised before RAG is implemented:
- `POST /api/chat` — JWT required (user + admin)
- `GET /api/documents` — JWT required
- `POST /api/documents` — admin role required
- `DELETE /api/documents/{doc_id}` — admin role required

---

### M6 — main.py wired up ✅ (detect: `from .api.auth import router as auth_router` in main.py)

- `init_db()` runs in lifespan
- CORS middleware: origins from `config/backend.yaml`, overridable via `ALLOWED_ORIGINS` env var
- Body size limit (1 MB), security headers, HSTS in production

---

### M7 — SSO Documentation ✅ (detect: `AbstractAuthProvider` in auth.py)

Interface already in place. See `backend/app/services/dependency/auth.py` for the `AbstractAuthProvider` ABC.

---

### M8 — Tests ✅ (detect: `tests/auth/test_auth_endpoints.py`)

Pattern: `httpx.AsyncClient` + `ASGITransport`, in-memory SQLite override for `get_db`. No mocks of the database layer.

Covers: register, login, 401 without token, 403 wrong role, expired token, duplicate email.

---

## Deployment Checklist

Before deploying backend to Hetzner, verify:

- [ ] `JWT_SECRET` is 128 hex chars (run: `python -c "import secrets; print(secrets.token_hex(64))"`)
- [ ] `ENVIRONMENT=production` (enables HSTS, blocks `AUTH_MODE=mock`)
- [ ] `ALLOWED_ORIGINS` contains the exact frontend production origin
- [ ] `TRANSCRIPTION_PRELOAD_ON_STARTUP=true` (preload Whisper on boot, not lazily)
- [ ] `WHISPER_ENABLE_FAKE_FALLBACK=false` (default — errors surface visibly)
- [ ] `DATABASE_URL` points to a persistent volume (not ephemeral)

Before deploying frontend, verify:

- [ ] `VITE_API_URL=https://api.yourdomain.com` set in frontend build env
- [ ] `VITE_TRANSCRIPTION_WS_URL=wss://api.yourdomain.com/ws/transcribe` set in build env
- [ ] `vite build` runs from inside `frontend/` folder (config YAML is within the project root)

---

## Final Verification

```bash
# 1. Run auth tests
pytest tests/auth/ -v

# 2. Manual smoke test
JWT_SECRET=test-secret-key-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  uvicorn backend.app.main:app --port 8001 &
sleep 2

curl -s -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"secret123","role":"admin"}' | python -m json.tool

TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"secret123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/documents | python -m json.tool

# 3. Check preflight report in backend logs for Whisper status
```
