# Tests Structure

This repository keeps test-related assets under the `tests` folder.

## Layout

- `tests/python_test/service_1/`
  - Python tests for service 1.
- `tests/python_test/service_2/`
  - Python tests for service 2.

Coverage gate script location:
- `coverage/coverage_gate.py`
  - Generates the latest coverage report in dark mode.
  - Keeps only the latest report file in `coverage/` (plus the script itself).

Extend the same pattern for other services and languages.
