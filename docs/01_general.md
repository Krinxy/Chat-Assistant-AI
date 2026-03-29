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

- `services/`: API services (one service per bounded context)
- `packages/`: shared modules and utilities
- `tests/`: test suites and language-specific service tests
- `coverage/`: latest coverage report and gate script
- `docs/`: all project documentation

## Service Design Rules

- Services must communicate through clear API contracts.
- Services should be modular and independently runnable.
- APIs should support parallel task execution where possible.
- Role model must support `admin` and `user` permissions (JWT-based later).

## Current Security/Secrets State

- Local development reads credentials from `.env`.
- Runtime code should read only environment variables (no hardcoded credentials in source files).
- CI injects the same variable names from GitHub Secrets (without committing `.env`).
- Secret manager integration is planned and can be mocked in local/CI until server integration is available.
