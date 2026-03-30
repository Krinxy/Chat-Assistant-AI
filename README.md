# Chat-Assistant-AI
A modular multi-agent AI assistant for mobile applications, combining conversational intelligence, personalized recommendations, and behavior-driven user modeling in a unified frontend-backend architecture.

## Navigation

### Core Docs

- [01 General](docs/01_general.md)
- [02 Dependencies](docs/02_dependencies.md)
- [03 Quick Setup](docs/03_quick_setup.md)
- [04 Contribution Principles](docs/04_contribution_principles.md)
- [Code Quality](docs/codequality.md)

### Service Guides (by language)

- [Service Guides Index](docs/services/README.md)
- [TypeScript Services](docs/services/typescript.md)
- [JavaScript Services](docs/services/javascript.md)
- [Python Services](docs/services/python.md)
- [Go Services](docs/services/go.md)

### Main Project Folders

- [docs](docs)
- [services](services)
- [packages](packages)
- [frontend](frontend)
- [tests](tests)
- [coverage](coverage)

## Service Startup Direction

Each service should be documented and runnable independently. Use the language-specific guides in `docs/services/` to start and validate each service.

Recommended pattern per service:

- Keep API contract boundaries explicit.
- Keep source and tests paired by language conventions.
- Run lint, type checks, tests, and coverage before push.
