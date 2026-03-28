# Code Quality

## Minimum Rules

- Coverage threshold is minimum 80%.
- Every source file should have a corresponding test file.
- Linting must pass before push.
- Every new source file must include the required project header and contributor metadata defined in [04 Contribution Principles](04_contribution_principles.md).

## Language Gates

Python:

- `flake8`
- `black --check`
- `bandit`
- `mypy`
- `pytest`

TypeScript/JavaScript:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:coverage`

Go:

- `go test ./...`

.NET (C#):

- `dotnet test --nologo`

## Coverage Gate

- Coverage gate script: `coverage/coverage_gate.py`
- CI report output: `coverage/coverage-report.html`
- The coverage folder keeps only the latest report plus the gate script.

## Test Structure

- `tests/python_test/service_1/`
- `tests/python_test/service_2/`

Extend this pattern with one folder per service and language as the project grows.
