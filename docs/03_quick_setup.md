# 03 Quick Setup

## 1. Clone and Enter Project

```bash
git clone <repo-url>
cd Chat-Assistant-AI
```

## 2. Python Setup (3.11)

### Option A: venv

```bash
python -m venv .venv
# activate venv depending on shell
pip install --upgrade pip
```

### Python Dependency Presets

The full editable install matrix is maintained in [02 Dependencies](02_dependencies.md).

Recommended for local development:

```bash
pip install -e ".[development]"
```

### Option B: conda (keeps TOML as source of truth)

Use the project config file [environment.yml](../environment.yml):

```bash
conda env create -f environment.yml
conda activate chat-assistant-ai
```

## 3. Node Setup

```bash
npm install
```

Node/Nest controls runtime behavior for TypeScript services.
`npm` is primarily the dependency bootstrap and script entry layer.

### Runtime/Quality Commands by Language

| Stack | Install | Run | Quality |
|---|---|---|---|
| Python | `pip install -e ".[development]"` | `uvicorn app.main:app --reload` | `flake8 . && black --check . && bandit -c pyproject.toml -r coverage services packages scripts --skip B101 --confidence-level high && mypy . && pytest` |
| TypeScript/JavaScript (Node/Nest) | `npm install` | `npm run start --if-present` | `npm run lint && npm run typecheck && npm test && npm run test:coverage` |
| Go | `go mod tidy` | `go run ./...` | `go test ./...` |
| .NET | `dotnet restore` | `dotnet run --project <path-to-service.csproj>` | `dotnet test --nologo` |

## 4. Local Environment (.env)

All credentials are read from environment variables.
For local development, store them in `.env` and do not commit `.env`.

Create your local `.env` manually and keep it out of version control.

Required credential variables:

- `OPENAI_API_KEY`
- `USERNAME`
- `PASSWORD`
- `LOGIN_URL`

## 5. Run Checks (recommended before push)

Python:

```bash
flake8 .
black --check .
bandit -c pyproject.toml -r coverage services packages scripts --skip B101 --confidence-level high
mypy .
pytest
```

Node:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
```

## 6. Coverage Gate

```bash
python coverage/coverage_gate.py --threshold 80
```

## 7. Service Startup Guides

Go to [docs/services/README.md](services/README.md) for per-language startup commands.
