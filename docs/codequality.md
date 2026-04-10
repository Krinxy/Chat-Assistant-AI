# Code Quality

## Minimum Rules

- Coverage target is minimum 80%.
- Every source file should have a corresponding test file.
- Linting must pass before push.
- Bandit security scan must pass before push.
- Every new source file must include the required project header and contributor metadata defined in [04 Contribution Principles](04_contribution_principles.md).

## Language Gates

Python:

- `flake8`
- `black --check`
- `bandit`
- `pytest`

TypeScript/JavaScript:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:coverage`
- `npm --prefix frontend run lint --if-present`
- `npm --prefix frontend run typecheck --if-present`

Go:

- `go test ./...`

.NET (C#):

- `dotnet test --nologo`

Kotlin:

- `./gradlew test` (when Kotlin modules exist)

## CI/CD Stage Order

The CI pipeline enforces three required GitHub checks:

1. Lint Gate
2. Bandit Gate
3. Test And Build Gate

`Test And Build Gate` depends on `Lint Gate` and `Bandit Gate`, so it only runs after both quality gates are green.

For branch protection on `main`, mark these checks as required:

- `Lint Gate`
- `Bandit Gate`
- `Test And Build Gate`

## Local Hooks

Repository includes `.pre-commit-config.yaml` with mandatory local checks:

- `black --check`
- `flake8`
- `bandit`
- `npm --prefix frontend run lint`

Install once:

1. `python -m pip install pre-commit`
2. `pre-commit install`

## Coverage Gate

- Coverage gate script: `coverage/coverage_gate.py`
- CI report output: `coverage/coverage-report.html`
- The coverage folder keeps only the latest report plus the gate script.
- Coverage is treated as a testing module, not as a runtime service.

## Test Structure

- Primary active tests live in `tests/`.
- `tests/python_test/` exists as a legacy subtree and is not the default CI target.
- Keep tests grouped by domain when useful (for example `tests/frontend`, `tests/backend`, `tests/integration`).
- Use source-to-test naming symmetry so CI mapping checks remain deterministic.
