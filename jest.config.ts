import type { Config } from 'jest';

const config: Config = {
  roots: ['<rootDir>/services', '<rootDir>/packages', '<rootDir>/tests'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*_test.ts',
    '**/*.spec.js',
    '**/*.test.js',
    '**/*_test.js',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'services/**/*.{ts,js}',
    'packages/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/*_test.ts',
    '!**/*.spec.js',
    '!**/*.test.js',
    '!**/*_test.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  passWithNoTests: true,
};

export default config;