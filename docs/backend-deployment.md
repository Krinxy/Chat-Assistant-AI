# Backend deployen (FastAPI + Postgres + Redis)

## Kurz vorweg: warum nicht das bestehende Hetzner-Webhosting-Paket?

Der Hetzner-Zugang, der für den Frontend-Deploy genutzt wird (`docs/postgres-docker-setup.md`
verlinkter Workflow `.github/workflows/deploy-hetzner.yml`), ist ein **Shared-Webhosting-Paket**
(erkennbar an `www*.your-server.de`, Home-Verzeichnis `/usr/home/<user>`, `public_html` als
Symlink nach `/usr/www/users/<user>`). Darauf gibt es kein root, kein Docker, keine Möglichkeit,
einen dauerhaften Prozess (uvicorn) laufen zu lassen oder einen eigenen Port zu öffnen — nur
Dateien ablegen (das, was der Frontend-Deploy tut). Postgres/Redis laufen dort erst recht nicht.

**Das Backend braucht etwas anderes:** irgendeinen Server mit Docker + Compose-Plugin und einer
eigenen (Sub-)Domain. Das kann ein Hetzner Cloud Server sein, muss es aber nicht — alles unten
funktioniert auf jedem Host mit Docker.

## Warum nicht Vercel für das Backend?

Vercel ist für serverlose Functions + statisches Hosting gebaut — gut fürs Frontend, aber nicht
für diesen Backend-Typ: kein dauerhafter Prozess, keine persistente Postgres/Redis-Instanz, und
die WebSocket-Route (`/ws/transcribe`, siehe `backend/app/services/core/chat/transcription/websocket.py`)
braucht eine langlebige Verbindung, die serverlose Plattformen typischerweise nicht unterstützen.

Wenn du dir keinen eigenen Server verwalten willst, sind das die realistischeren Alternativen —
alle unterstützen Docker-Compose-artige Deploys inkl. managed Postgres:

| Option | Aufwand | Kosten (ca.) | Bemerkung |
|---|---|---|---|
| **Hetzner Cloud Server (CX-Typ)** | Server selbst pflegen (Updates, Sicherheit) | ab ~4€/Monat | Volle Kontrolle, dieses Repo hat schon `docker-compose.prod.yml` dafür |
| **Railway** | Sehr wenig (git-push-to-deploy) | Nutzungsbasiert, kleiner Free-Tier | Managed Postgres/Redis inklusive |
| **Render** | Wenig | Free-Tier vorhanden (schläft bei Inaktivität) | Managed Postgres separat buchbar |
| **Fly.io** | Mittel (eigene `fly.toml`) | Kleiner Free-Tier | Gut für WebSocket-Workloads |

Diese Anleitung deckt den **eigenen Server**-Weg ab (Hetzner Cloud oder sonst wo) — das ist der
Weg, für den `docker-compose.prod.yml` in diesem Repo bereits vorbereitet ist.

---

## Voraussetzungen

- Ein Server mit öffentlicher IPv4/IPv6-Adresse, SSH-Zugang mit root oder sudo
- Docker + Docker Compose Plugin installiert (`curl -fsSL https://get.docker.com | sh`)
- Eine (Sub-)Domain, die per DNS A/AAAA-Record auf die Server-IP zeigt (z. B. `api.deinedomain.de`)
- Ports 80 und 443 in der Firewall offen (Caddy braucht sie für Let's-Encrypt-TLS)

---

## 1. Repo auf den Server holen

```bash
git clone git@github.com:Krinxy/Chat-Assistant-AI.git
cd Chat-Assistant-AI
```

## 2. `.env` anlegen

```bash
cp .env.example .env
```

Zusätzlich zu den üblichen Variablen (siehe `docs/postgres-docker-setup.md`) braucht
`docker-compose.prod.yml` noch:

```env
POSTGRES_PASSWORD=<starkes, zufälliges Passwort>
ALLOWED_ORIGINS=https://deine-frontend-domain.de
UVICORN_WORKERS=2
```

`JWT_SECRET` generieren:

```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
```

## 3. Domain in der `Caddyfile` eintragen

`Caddyfile` im Repo-Root öffnen und `api.yourdomain.com` durch deine echte Backend-Domain ersetzen.

## 4. Stack starten

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Alembic-Migrationen laufen automatisch beim Backend-Start (gleiche Logik wie lokal). Danach:

```bash
# Admin-Account anlegen
docker compose -f docker-compose.prod.yml exec -w /app backend python backend/scripts/create_admin.py <email> <passwort>

# Firmen-Mock-Daten seeden (optional, falls das Company Workspace Feature genutzt wird)
docker compose -f docker-compose.prod.yml exec -w /app backend python backend/scripts/seed_company_data.py
```

## 5. Testen

```bash
curl https://api.deinedomain.de/health
```

Erwartete Antwort: `{"status":"ok","llm":"configured"}`. Caddy holt das TLS-Zertifikat beim ersten
Request automatisch — der allererste Aufruf kann ein paar Sekunden dauern.

## 6. Frontend darauf zeigen lassen

Im Frontend-Build (egal ob lokal oder im GitHub-Actions-Workflow) `VITE_API_URL` und
`VITE_TRANSCRIPTION_WS_URL` auf die neue Backend-Domain setzen:

```env
VITE_API_URL=https://api.deinedomain.de
VITE_TRANSCRIPTION_WS_URL=wss://api.deinedomain.de/ws/transcribe
```

---

## Deployment-Checkliste

- [ ] `JWT_SECRET` ist 128 Hex-Zeichen (nicht der Docker-Dev-Default)
- [ ] `POSTGRES_PASSWORD` ist stark und nicht das Docker-Dev-`chat`/`chat`
- [ ] `ALLOWED_ORIGINS` enthält exakt die Frontend-Produktions-Domain (kein `*`)
- [ ] `ENVIRONMENT=production` gesetzt (aktiviert HSTS, blockt `AUTH_MODE=mock`)
- [ ] DNS-Record für die Backend-Domain zeigt auf die Server-IP, *bevor* der Stack startet
  (Caddy braucht das für die Zertifikatsausstellung)
- [ ] Firewall lässt nur 80/443 (und SSH) rein — 5432/6379/8000 sind bewusst nicht gemappt

## Updates einspielen

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

## Automatisierung (CI/CD) — noch offen

`.github/workflows/deploy-hetzner.yml` deployt aktuell nur das statische Frontend. Sobald klar
ist, wo das Backend läuft (eigener Server, Railway, ...), kann ein analoger Workflow ergänzt
werden, der bei jedem main-Push per SSH `git pull && docker compose up -d --build` auf dem
Server ausführt — das ist bewusst noch nicht gebaut, weil das Zielsystem noch nicht feststeht.
