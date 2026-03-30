# 04 Contribution Principles

## Goal

All contributions follow one consistent standard across languages and services.

## Mandatory File Header

Every source file must start with a header that contains:

- copyright owner
- contributor name
- contributor email

Minimum required metadata:

- Copyright: Chat-Assistant-AI Team
- Contributor: Full Name
- Contact: valid email

## Header Templates

Python (`.py`):

```python
# Copyright (c) Chat-Assistant-AI Team
# Contributor: Max Mustermann <max@example.com>
```

TypeScript / JavaScript (`.ts`, `.js`):

```ts
/**
 * Copyright (c) Chat-Assistant-AI Team
 * Contributor: Max Mustermann <max@example.com>
 */
```

Go (`.go`):

```go
// Copyright (c) Chat-Assistant-AI Team
// Contributor: Max Mustermann <max@example.com>
```

C# (`.cs`):

```csharp
// Copyright (c) Chat-Assistant-AI Team
// Contributor: Max Mustermann <max@example.com>
```

## Code Quality Is Mandatory

All contributions must pass repository quality gates defined in [Code Quality](codequality.md):

- linting
- type checks
- tests
- security checks
- minimum 80% coverage

## Commit Prefix Convention

Use the following fixed commit prefixes:

- `docs:` for documentation updates
- `add:` for new files or new functionality
- `refactor:` for restructuring existing code/files without changing intended behavior
- `fix:` for bug fixes and quick issue patches
- `test:` for adding or updating tests
- `ci:` for CI/CD workflow changes
- `chore:` for maintenance tasks (tooling/config cleanup)

Commit format:

```text
<prefix>: <short description>
```

Examples:

```text
docs: add quick setup for conda and venv
add: create Python service scaffold for auth API
refactor: split request validator into shared module
fix: handle missing jwt role claim in auth middleware
test: add coverage tests for service_1 endpoints
ci: enforce coverage gate at 80 percent
chore: update lint config and remove unused scripts
```

## Common Scenarios

Scenario 1: You add a new markdown guide

- Prefix: `docs:`
- Example: `docs: add contribution header examples`

Scenario 2: You add a new service file or endpoint

- Prefix: `add:`
- Example: `add: create notifications service bootstrap`

Scenario 3: You reorganize files for cleaner structure without feature change

- Prefix: `refactor:`
- Example: `refactor: move coverage gate into coverage folder`

Scenario 4: You patch a runtime bug

- Prefix: `fix:`
- Example: `fix: correct role check for admin dashboard route`

Scenario 5: You only add or improve tests

- Prefix: `test:`
- Example: `test: add integration tests for login flow`

Scenario 6: You change pipeline behavior

- Prefix: `ci:`
- Example: `ci: upload dark-mode coverage report artifact`

Scenario 7: You update configs or housekeeping tasks

- Prefix: `chore:`
- Example: `chore: align tsconfig include paths`

## Contribution Checklist

Before opening a pull request:

1. Add required file header to each new source file.
2. Keep tests aligned with changed source files.
3. Run local quality commands for the affected language.
4. Ensure coverage stays at or above 80%.
5. Keep docs updated when commands, dependencies, or startup flow changes.

## Style Consistency

- Follow existing folder and naming conventions per service.
- Keep changes modular and scoped to a clear service responsibility.
- Prefer small, reviewable pull requests.
