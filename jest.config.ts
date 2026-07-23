import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/storage/migrate.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 60,
      lines: 50,
      statements: 50,
    },
  },
  moduleNameMapper: {
    '^@collectors/(.*)$': '<rootDir>/src/collectors/$1',
    '^@rules/(.*)$': '<rootDir>/src/rules/$1',
    '^@engine/(.*)$': '<rootDir>/src/engine/$1',
    '^@notifications/(.*)$': '<rootDir>/src/notifications/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@storage/(.*)$': '<rootDir>/src/storage/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
};

export default config;
