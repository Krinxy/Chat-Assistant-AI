# 01 General

## Purpose

This document describes the general architecture and documentation flow for this repository.

## Documentation Order

1. [01 General](01_general.md)
2. [02 Dependencies](02_dependencies.md)
3. [03 Quick Setup](03_quick_setup.md)
4. [04 Contribution Principles](04_contribution_principles.md)
5. [Service Guides](services/README.md)
6. [Code Quality](codequality.md)

## Project Layout

- `backend/`: backend services and APIs
- `frontend/`: UI module with `src/app`, `src/pages`, `src/features`, `src/entities`, `src/widgets`, and `src/shared`
- `tests/`: test suites
- `coverage/`: latest coverage report and gate script
- `docs/`: all project documentation
- `.github/workflows/`: CI/CD workflows

## Service Design Rules

- Services must communicate through clear API contracts.
- Services should be modular and independently runnable.
- APIs should support parallel task execution where possible.
- Role model must support `admin` and `user` permissions (JWT-based later).

## Current Security/Secrets State

- Local development reads credentials from `.env`.
- Runtime code should read only environment variables (no hardcoded credentials in source files).
- CI defines environment variables in the workflow environment and supports repository/runner overrides.
