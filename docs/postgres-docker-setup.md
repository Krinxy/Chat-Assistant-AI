# PostgreSQL via Docker — Setup Guide

## Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert und gestartet
- Node.js ≥ 18 (für Frontend)
- Python ≥ 3.11 (für Backend)
- Git-Repo geklont

---

## 1. `.env` anlegen

Kopiere `.env.example` (falls vorhanden) oder lege `.env` im Projekt-Root an:

```env
# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=<mind. 64 zufällige Bytes als Hex — siehe unten>
JWT_EXPIRES_MINUTES=15
JWT_ISS=aura-auth
JWT_AUD=aura-api
AUTH_MODE=jwt

# ── Environment ───────────────────────────────────────────────────────────────
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://chat:chat@localhost:5432/chatdb

# ── Chroma ────────────────────────────────────────────────────────────────────
CHROMA_PATH=./chroma_db

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175

# ── LLM Provider: Gemini ──────────────────────────────────────────────────────
GEMINI_API_KEY=<dein Gemini API Key>
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# ── LLM Provider: local gateway (optional) ────────────────────────────────────
OPENAI_API_KEY=<dein lokaler Gateway Key oder leer lassen>
OPENAI_BASE_URL=<deine lokale Gateway URL oder leer lassen>

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
SPEECH_CACHE_TTL_SECONDS=3600

# ── Transcription ─────────────────────────────────────────────────────────────
WHISPER_ENABLE_FAKE_FALLBACK=1
TRANSCRIPTION_PRELOAD_ON_STARTUP=0
```

**JWT_SECRET generieren** (einmalig, im Terminal):

```bash
# PowerShell
-join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

# oder Python
python -c "import secrets; print(secrets.token_hex(64))"
```

> Den gleichen `JWT_SECRET` auf allen Geräten verwenden — sonst sind bestehende Tokens ungültig.

---

## 2. Docker-Container starten

```bash
docker compose -f docker-compose.services.yml up -d
```

Prüfen ob Postgres läuft:

```bash
docker compose -f docker-compose.services.yml ps
```

Erwartete Ausgabe:
```
NAME                    STATUS
<project>-db-1          Up (healthy)
<project>-redis-1       Up
```

---

## 3. Python-Dependencies installieren

```bash
cd backend
pip install -r requirements.txt
```

---

## 4. Backend starten (mit Auto-Migration)

```bash
# vom Projekt-Root aus
python -m uvicorn backend.app.main:app --reload --port 8000
```

Beim ersten Start läuft Alembic automatisch und legt alle Tabellen an. Du siehst im Log:

```
INFO  Running Alembic migrations …
INFO  Migrations complete.
INFO  Application startup complete.
```

---

## 5. Admin-Account anlegen (einmalig pro frischer DB)

```bash
python backend/scripts/create_admin.py
```

Das Skript fragt nach E-Mail und Passwort und legt einen Account mit `role: admin` an.

---

## 6. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173).

---

## Täglicher Workflow

```bash
# 1. Backing services starten (falls Docker nicht läuft)
docker compose -f docker-compose.services.yml up -d

# 2. Backend
python -m uvicorn backend.app.main:app --reload --port 8000

# 3. Frontend (separates Terminal)
cd frontend && npm run dev
```

---

## Geräte wechseln

Damit du auf einem anderen Gerät nahtlos weiterarbeitest, braucht das neue Gerät:

| Was | Wo |
|---|---|
| Git-Repo | `git clone` + `git pull` |
| `.env` | manuell übertragen (nie committen!) |
| Docker Desktop | lokal installiert |
| Postgres-Daten | laufen im Docker-Volume — **nicht** übertragen |

> Die Datenbank-Daten (User, Sessions) liegen im Docker-Volume `postgres_data` und sind gerätespezifisch. Nach einem `git clone` auf dem neuen Gerät musst du einmalig den Admin-Account neu anlegen (Schritt 5).

---

## Nützliche Befehle

```bash
# Container stoppen (Daten bleiben)
docker compose -f docker-compose.services.yml stop

# Container + Daten komplett löschen (Reset)
docker compose -f docker-compose.services.yml down -v

# Direkt in Postgres rein
docker compose -f docker-compose.services.yml exec db psql -U chat -d chatdb

# Alembic-Migrations manuell ausführen
python -m alembic -c backend/alembic.ini upgrade head

# Logs des Backends
# (einfach im Terminal wo uvicorn läuft)
```

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| `connection refused` auf Port 5432 | Docker Desktop läuft nicht → starten, dann `docker compose ... up -d` |
| `password authentication failed` | `.env` prüfen: `DATABASE_URL` muss `chat:chat@localhost:5432/chatdb` lauten |
| Port 5432 already in use | Lokales Postgres läuft → `net stop postgresql` (Windows) oder `brew services stop postgresql` (Mac) |
| `relation "users" does not exist` | Alembic lief nicht durch → `python -m alembic -c backend/alembic.ini upgrade head` |
| Backend startet nicht wegen Torch-Import | Normal bei kaltem Start — warten oder `TRANSCRIPTION_PRELOAD_ON_STARTUP=0` setzen (schon gesetzt) |
