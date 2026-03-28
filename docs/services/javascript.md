# JavaScript Services

## Dependency Setup

```bash
npm install
```

## Start Development Service

```bash
npm run start --if-present
```

## Quality Gates

```bash
npm run lint
npm test
npm run test:coverage
```

## Service Notes

- Keep one `.js` source file with matching test file pattern (`*.test.js` or `*.spec.js`).
- Use clear API route boundaries for each microservice task.
