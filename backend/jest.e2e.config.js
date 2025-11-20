/**
 * Jest Configuration for E2E Tests
 * Automatically starts/stops backend server
 */

export default {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  
  // Set environment variables for test process
  setupFiles: ['<rootDir>/tests/e2e/jest-setup-env.js'],
  
  // Use ES modules (no transform needed)
  transform: {},
  
  // Global setup/teardown for server lifecycle
  globalSetup: '<rootDir>/tests/e2e/setup.js',
  globalTeardown: '<rootDir>/tests/e2e/teardown.js',
  
  // Only run E2E tests
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.js',
    '<rootDir>/tests/products/**/e2e/**/*.test.js'
  ],
  
  // Increase timeout for E2E tests (server startup + test execution)
  testTimeout: 60000,
  
  // Run tests serially (not in parallel) to avoid port conflicts
  maxWorkers: 1,
  
  // Don't collect coverage for E2E tests (too slow)
  collectCoverage: false,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true
};
