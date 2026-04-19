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
- [backend](backend)
- [frontend](frontend)
- [Frontend Module README](frontend/README.md)
- [tests](tests)
- [coverage](coverage)

## Service Startup Direction

Each stack should be documented and runnable independently. Use the language-specific guides in `docs/services/` to start and validate each runtime.

Current repository quality pattern:

- Keep API contract boundaries explicit.
- Keep source and tests paired by language conventions.
- Run lint, type checks, tests, and coverage before push.

Frontend steering highlights:

- New chat creation is handled from the sidebar Current Session action.
- Voice input triggers a dedicated speech service from the microphone button and streams text back live.
- Profile includes a help/forum section for feature lookup.

Local voice stack launch:

1. `npm run dev`

Manual fallback (two terminals):

1. `npm --prefix backend run dev`
2. `npm --prefix frontend run dev`

## Quality Gates For Main

The main branch is protected by required CI checks:

- Lint Gate
- Bandit Gate
- Test And Build Gate

For local enforcement before commit, install hooks once:

1. `python -m pip install pre-commit`
2. `pre-commit install`
