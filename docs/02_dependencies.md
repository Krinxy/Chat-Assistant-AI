# 02 Dependencies

## Python

Managed via `pyproject.toml` optional groups:

- `backend`
- `frontend`
- `development`
- `all`
- `production` (currently intentionally empty)

Editable install matrix:

| Purpose | Command |
|---|---|
| Core package | `pip install -e .` |
| All extras (meta extra) | `pip install -e ".[all]"` |
| All extras (direct grouping) | `pip install -e ".[backend,frontend,development]"` |
| Development extras | `pip install -e ".[development]"` |
| Backend extras | `pip install -e ".[backend]"` |
| Frontend extras | `pip install -e ".[frontend]"` |
| Production extras (currently empty) | `pip install -e ".[production]"` |

Conda option (still TOML-based dependencies):

```bash
conda env create -f environment.yml
conda activate chat-assistant-ai
```

## TypeScript / JavaScript

Managed via `package.json`:

- strict linting (`eslint`)
- strict type checks (`tsc --noEmit`)
- tests + coverage (`jest`)

Runtime and service orchestration are Node.js/Nest-based.
`npm` is used primarily to install dependencies and trigger scripts.

Install:

```bash
npm install
```

## Go

Go dependencies are managed with `go.mod` per Go service.

Install/update:

```bash
go mod tidy
```

## .NET (C#)

Dependencies are managed via `.csproj`/NuGet.

Restore:

```bash
dotnet restore
```

## Coverage / Quality

- minimum coverage threshold is 80%
- repository coverage is validated by `coverage/coverage_gate.py`
- report artifact output is generated from CI
