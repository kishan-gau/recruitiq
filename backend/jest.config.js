export default {
  // Use node environment for testing
  testEnvironment: 'node',

  // Enable ES modules support
  transform: {},

  // Global setup and teardown
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/__tests__/**',
    '!src/**/*.test.js',
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
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

