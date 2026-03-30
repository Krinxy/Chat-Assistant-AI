# Service Guides

Use this section to navigate to language-specific service startup and structure guides.

## Language Guides

- [TypeScript Services](typescript.md)
- [JavaScript Services](javascript.md)
- [Python Services](python.md)
- [Go Services](go.md)
- [Frontend Module](../../frontend/README.md)

## Service Folder Convention

Current repository runtime roots:

- `backend/`
- `frontend/`

Service contents in this repository:

- `src/` for source code
- `tests/` for tests
- language config files (`tsconfig.json`, `pyproject.toml`, `go.mod`, etc.)

## API-First Rule

All services should expose explicit API contracts and support modular communication.
