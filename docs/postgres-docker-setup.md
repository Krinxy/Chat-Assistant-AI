# Docker Setup — Postgres, Redis & Frontend

## Schnellstart (Windows)

```powershell
./scripts/setup-dev.ps1
```

Prüft/installiert Docker Desktop (via winget, falls nicht vorhanden), legt `.env` an (inkl.
generiertem `JWT_SECRET`), installiert die Python-Abhängigkeiten in die vorhandene venv/conda-Umgebung
(oder legt eine `.venv` an, falls keine existiert — gleiche Logik wie [03 Quick Setup](03_quick_setup.md)),
installiert die npm-Pakete, baut und startet den kompletten Docker-Stack und seedet die
Firmen-Mock-Daten. Idempotent — kann beliebig oft erneut ausgeführt werden. Mit `-SkipDockerUp`
installiert es nur, ohne den Stack zu starten.

Die folgenden Abschnitte beschreiben die einzelnen Schritte manuell, falls du lieber selbst steuern
oder auf einem anderen OS arbeiten möchtest.

## Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert und gestartet
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

## 2. Komplettes System per Docker starten (Backend + Frontend + Postgres + Redis)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Das startet vier Container:

| Service | Port | Beschreibung |
|---|---|---|
| `backend` | 8000 | FastAPI, Hot-Reload über Bind-Mount |
| `frontend` | 5173 | Vite-Dev-Server, Hot-Reload über Bind-Mount |
| `db` | 5432 | Postgres 16, Datenbank `chatdb` |
| `redis` | 6379 | Cache für Speech/RAG |

Prüfen ob alles läuft:

```bash
docker compose -f docker-compose.dev.yml ps
```

Frontend erreichbar unter [http://localhost:5173](http://localhost:5173), Backend-API unter `http://localhost:8000` (`/docs` für Swagger).

Alembic läuft beim Backend-Start automatisch (`run_migrations()` in der FastAPI-Lifespan-Funktion) und legt alle Tabellen an — inklusive `users`, `companies`, `personal_colleagues`, `personal_appointments`.

### Nur Backing-Services (Postgres + Redis), Backend/Frontend lokal

Für schnellere Iteration am Backend oder Frontend reicht es, nur die Datenbank-Services im Container laufen zu lassen:

```bash
docker compose -f docker-compose.services.yml up -d
```

```bash
# Backend lokal
pip install -e ".[backend]"   # einmalig, aus dem Repo-Root (siehe pyproject.toml)
python -m uvicorn backend.app.main:app --reload --port 8000

# Frontend lokal (separates Terminal)
cd frontend
npm install
npm run dev
```

---

## 3. Admin-Account anlegen (einmalig pro frischer DB)

```bash
python backend/scripts/create_admin.py <email> <passwort>
```

Legt einen Account mit `role: admin` an.

---

## 4. Firmen-Mock-Daten seeden (Company Workspace / Desk)

Die im Company Workspace und auf dem persönlichen Desk angezeigten Firmen, Kollegen und Termine kommen aus den Postgres-Tabellen `companies`, `personal_colleagues` und `personal_appointments` (nicht mehr aus einer statischen Frontend-Datei). Einmalig befüllen:

```bash
python backend/scripts/seed_company_data.py
```

Das Skript ist idempotent — jeder Aufruf ersetzt den Inhalt der drei Tabellen durch den aktuellen Demo-Datensatz (12 Firmen, 5 Kollegen, 8 persönliche Termine). Läuft gegen die `DATABASE_URL` aus `.env`, also z. B. direkt gegen die containerisierte Postgres:

```bash
# Achtung: der backend-Service hat working_dir /app/backend gesetzt — hier explizit auf
# /app (Repo-Root) umschalten, sonst wird der Skriptpfad doppelt aufgelöst.
docker compose -f docker-compose.dev.yml exec -w /app backend python backend/scripts/seed_company_data.py
```

---

## Täglicher Workflow

```bash
# Alles per Docker (Backend + Frontend + Postgres + Redis)
docker compose -f docker-compose.dev.yml up

# ODER: nur Backing-Services, Rest lokal
docker compose -f docker-compose.services.yml up -d
python -m uvicorn backend.app.main:app --reload --port 8000
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

> Die Datenbank-Daten (User, Sessions, Firmen-Mock-Daten) liegen im Docker-Volume `postgres_data` und sind gerätespezifisch. Nach einem `git clone` auf dem neuen Gerät musst du einmalig den Admin-Account (Schritt 3) und die Firmen-Mock-Daten (Schritt 4) neu anlegen.

---

## Nützliche Befehle

```bash
# Container stoppen (Daten bleiben)
docker compose -f docker-compose.dev.yml stop

# Container + Daten komplett löschen (Reset)
docker compose -f docker-compose.dev.yml down -v

# Direkt in Postgres rein
docker compose -f docker-compose.dev.yml exec db psql -U chat -d chatdb

# Alembic-Migrations manuell ausführen
python -m alembic -c alembic.ini upgrade head

# Logs eines Service
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| `connection refused` auf Port 5432 | Docker Desktop läuft nicht → starten, dann `docker compose ... up -d` |
| `password authentication failed` | `.env` prüfen: `DATABASE_URL` muss `chat:chat@localhost:5432/chatdb` lauten |
| Port 5432 / 5173 already in use | Lokaler Prozess blockiert den Port → lokalen Postgres/Vite-Server stoppen oder Port in `docker-compose.dev.yml` anpassen |
| `relation "users" does not exist` | Alembic lief nicht durch → `python -m alembic -c alembic.ini upgrade head` |
| Company Workspace / Desk zeigen keine Firmen | Seed-Skript noch nicht gelaufen → Schritt 4 ausführen |
| `python: can't open file '/app/backend/backend/...'` bei `docker compose exec backend python backend/...` | Der `backend`-Service hat `working_dir: /app/backend` — bei `exec` mit repo-root-relativen Pfaden (`backend/scripts/...`, `alembic -c alembic.ini ...`) immer `-w /app` anhängen, z. B. `docker compose ... exec -w /app backend python backend/scripts/create_admin.py ...` |
| Frontend-Container startet, aber `npm ci` schlägt fehl | `frontend/package-lock.json` und `package.json` müssen zueinander passen — lokal `npm install` laufen lassen und Lockfile committen |
| Backend startet nicht wegen Torch-Import | Normal bei kaltem Start — warten oder `TRANSCRIPTION_PRELOAD_ON_STARTUP=0` setzen (schon gesetzt) |
