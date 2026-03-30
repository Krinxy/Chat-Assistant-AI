# Code Quality

## Minimum Rules

- Coverage target is minimum 80%.
- Every source file should have a corresponding test file.
- Linting must pass before push.
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

The pipeline is intentionally bundled as one job with this order:

1. Setup Environment
2. Dependencies
3. Linting
4. Security
5. SonarQube
6. Test
7. Run
8. Docker
9. Complete Job

## Coverage Gate

- Coverage gate script: `coverage/coverage_gate.py`
- CI report output: `coverage/coverage-report.html`
- The coverage folder keeps only the latest report plus the gate script.
- Coverage is treated as a testing module, not as a runtime service.

## Test Structure

- `tests/python_test/service_1/`
- `tests/python_test/service_2/`

Extend this pattern with one folder per service and language as the project grows.
