# Tests Structure

This repository keeps test-related assets under the `tests` folder.

## Layout

- `tests/`
  - Primary test location for Python and integration checks.
- `tests/python_test/`
  - Legacy subtree.
  - Not required by CI and currently not used as the main test target.

The CI pipeline enforces source-to-test mapping for Python files under `frontend`, `backend`, and `shared`.

Coverage gate script location:
- `coverage/coverage_gate.py`
  - Generates the latest coverage report in dark mode.
  - Keeps only the latest report file in `coverage/` (plus the script itself).

## Current Pattern

- Keep active tests directly under `tests/` and group by domain when needed (for example `tests/frontend`, `tests/backend`, `tests/integration`).
- Keep test names aligned to source files (`test_<module>.py` or `<module>_test.py`) to satisfy CI mapping checks.
- Add tests for each new source file so linting, security, and coverage gates stay green.
