<#
.SYNOPSIS
  One-shot local dev bootstrap for Windows: installs whatever is missing (Docker Desktop,
  Python env, npm deps), brings up the full docker-compose stack, and seeds demo data.

.DESCRIPTION
  Safe to re-run - every step first checks whether it's already done before acting.
  Mirrors the manual steps in docs/postgres-docker-setup.md and docs/03_quick_setup.md.

.PARAMETER SkipDockerUp
  Install/prepare everything but don't actually start the docker-compose stack at the end.

.EXAMPLE
  ./scripts/setup-dev.ps1
#>

param(
    [switch]$SkipDockerUp
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# --- 1. Docker Desktop ----------------------------------------------------------------
Write-Step "Docker"

Refresh-Path
$dockerExe = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"

if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and -not (Test-Path $dockerExe)) {
    Write-Warn "Docker not found - installing Docker Desktop via winget (needs admin approval)."
    winget install --id Docker.DockerDesktop -e --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
    Write-Ok "Docker Desktop installed."
} else {
    Write-Ok "Docker already installed."
}

# Prefer the plain command once PATH has it; fall back to the full path otherwise.
$docker = if (Get-Command docker -ErrorAction SilentlyContinue) { "docker" } else { $dockerExe }

$engineUp = $false
try { & $docker version --format '{{.Server.Version}}' *>$null; $engineUp = $? } catch { $engineUp = $false }

if (-not $engineUp) {
    Write-Warn "Docker engine not running - starting Docker Desktop (first start can take a minute)."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        & $docker version --format '{{.Server.Version}}' *>$null
        if ($?) { $engineUp = $true; break }
        Start-Sleep -Seconds 5
    }
}

if (-not $engineUp) {
    Write-Warn "Docker engine still not reachable after 180s - check Docker Desktop manually, then re-run this script."
    exit 1
}
Write-Ok "Docker engine is up."

# --- 2. .env -----------------------------------------------------------------------
Write-Step ".env"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    $jwtSecret = -join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
    (Get-Content ".env") -replace 'replace-with-a-random-128-char-hex-string', $jwtSecret | Set-Content ".env"
    Write-Ok ".env created from .env.example with a generated JWT_SECRET."
    Write-Warn "Fill in GEMINI_API_KEY / OPENAI_API_KEY in .env before using the chat features."
} else {
    Write-Ok ".env already exists - leaving it untouched."
}

# --- 3. Python environment (venv / conda - same convention as docs/03_quick_setup.md) --
Write-Step "Python environment"

if ($env:CONDA_DEFAULT_ENV) {
    Write-Ok "Conda env '$env:CONDA_DEFAULT_ENV' is active - installing into it."
    pip install -e ".[backend]"
} elseif (Test-Path ".venv") {
    Write-Ok ".venv already exists - installing/updating deps into it."
    & ".venv\Scripts\python.exe" -m pip install --upgrade pip
    & ".venv\Scripts\python.exe" -m pip install -e ".[backend]"
} elseif (Get-Command conda -ErrorAction SilentlyContinue) {
    Write-Warn "No active env found, conda is available - creating conda env from environment.yml."
    conda env create -f environment.yml
    Write-Ok "Run 'conda activate chat-assistant-ai' before using local (non-Docker) Python commands."
} else {
    Write-Warn "No active env, no conda - creating .venv."
    python -m venv .venv
    & ".venv\Scripts\python.exe" -m pip install --upgrade pip
    & ".venv\Scripts\python.exe" -m pip install -e ".[backend]"
    Write-Ok "Run '.venv\Scripts\Activate.ps1' before using local (non-Docker) Python commands."
}

# --- 4. Node deps (only needed for local, non-Docker frontend/backend dev) -------------
Write-Step "Node dependencies"
npm install
npm --prefix frontend install
Write-Ok "npm dependencies installed (root + frontend)."

# --- 5. Bring up the full stack -------------------------------------------------------
if ($SkipDockerUp) {
    Write-Step "Skipping docker compose up (-SkipDockerUp was passed)"
} else {
    Write-Step "Starting full stack (backend + frontend + postgres + redis)"
    docker compose -f docker-compose.dev.yml up --build -d
    Write-Ok "Stack started."

    Write-Step "Waiting for backend to become healthy"
    $deadline = (Get-Date).AddSeconds(120)
    $healthy = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -ErrorAction Stop
            if ($resp.status -eq "ok") { $healthy = $true; break }
        } catch {}
        Start-Sleep -Seconds 3
    }
    if ($healthy) {
        Write-Ok "Backend healthy."
    } else {
        Write-Warn "Backend didn't report healthy in time - check 'docker compose -f docker-compose.dev.yml logs backend'."
    }

    Write-Step "Seeding company/desk demo data"
    docker compose -f docker-compose.dev.yml exec -w /app backend python backend/scripts/seed_company_data.py

    Write-Host "`nDone. Frontend: http://localhost:5173  |  Backend docs: http://localhost:8000/docs`n" -ForegroundColor Green
    Write-Host "Create an admin account with:"
    Write-Host "  docker compose -f docker-compose.dev.yml exec -w /app backend python backend/scripts/create_admin.py EMAIL PASSWORD`n"
}
