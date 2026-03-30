# Go Services

## Dependency Setup

```bash
go mod tidy
```

## Start Service

```bash
go run ./...
```

## Quality Gates

```bash
go test ./...
```

## Service Notes

- Keep one `.go` source file with corresponding `*_test.go` tests.
- Organize API modules by responsibility for microservice boundaries.
