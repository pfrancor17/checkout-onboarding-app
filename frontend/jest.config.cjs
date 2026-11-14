/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  transform: { '^.+\\.(t|j)sx?$': 'babel-jest' },
  moduleNameMapper: {
    // import.meta.env only exists in Vite: tests use a fixed config.
    '^(\\.{1,2}/)+config/env$': '<rootDir>/src/test/env.mock.ts',
    '\\.(css)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|webp)$': '<rootDir>/src/test/file.mock.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/*.fixture.ts',
    '!src/config/env.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
