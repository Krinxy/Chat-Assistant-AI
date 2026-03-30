# TypeScript Services

TypeScript services are expected to run on Node.js with Nest-style service orchestration.

## Dependency Setup

```bash
npm install
```

Note: `npm` is used mainly for dependency installation and script entrypoints.
Service runtime behavior should be implemented in Node/Nest service code.

## Start Development Service

```bash
npm run build
npm run start --if-present
```

## Quality Gates

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
```

## Service Notes

- Keep one `.ts` source file with matching test file pattern (`*.test.ts` or `*.spec.ts`).
- Keep API handlers modular per bounded task.
