export default {
  // Use node environment for testing
  testEnvironment: 'node',

  // Enable ES modules support
  transform: {},

  // Global setup and teardown
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!dist/**',
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Timeout for integration tests
  testTimeout: 10000,

  // Coverage thresholds (note: singular 'Threshold')
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

