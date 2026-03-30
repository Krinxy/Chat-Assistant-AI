# 02 Dependencies

## Python

Managed via `pyproject.toml` optional groups:

- `backend`
- `frontend`
- `development`
- `all`
- `production` (currently intentionally empty)

CI and local tooling use `pyproject.toml` as the source of truth.

Typical install matrix:

| Purpose | Command |
|---|---|
| CI install | Automatic: workflow resolves and installs dependency groups from `pyproject.toml` |
| Local recommended | `conda env create -f environment.yml` |
| Production extras (currently empty) | reserved in `pyproject.toml` |

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
npm --prefix frontend install
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

## Credentials / Environment Variables

- Credentials are provided through environment variables.
- Local development uses a local `.env` file that is not versioned.
- CI uses the same variable names via GitHub Secrets injection.
- CI fails when `.env` or `.env.*` files are tracked in git.
