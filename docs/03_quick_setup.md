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

### Python Install Matrix (from pyproject.toml)

| Purpose | Command |
|---|---|
| Core package | `pip install -e .` |
| All extras | `pip install -e ".[all]"` |
| Development extras | `pip install -e ".[development]"` |
| Backend extras | `pip install -e ".[backend]"` |
| Frontend extras | `pip install -e ".[frontend]"` |
| Production extras (currently empty by design) | `pip install -e ".[production]"` |

Note: `pip install -e "[development]"` is not valid for this project. The correct extras syntax includes `.`: `pip install -e ".[development]"`.

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
| Python | `pip install -e ".[development]"` | `uvicorn app.main:app --reload` | `flake8 . && black --check . && bandit -r . && mypy . && pytest` |
| TypeScript/JavaScript (Node/Nest) | `npm install` | `npm run start --if-present` | `npm run lint && npm run typecheck && npm test && npm run test:coverage` |
| Go | `go mod tidy` | `go run ./...` | `go test ./...` |
| .NET | `dotnet restore` | `dotnet run --project <path-to-service.csproj>` | `dotnet test --nologo` |

## 4. Local Environment

Create `.env` and set local credentials/URLs.

## 5. Run Checks (recommended before push)

Python:

```bash
flake8 .
black --check .
bandit -r .
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
