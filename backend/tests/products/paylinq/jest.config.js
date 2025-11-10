/**
 * Jest Configuration for Paylinq Tests
 * 
 * Test configuration for the Paylinq product.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/products/paylinq/**/*.test.js'
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/products/paylinq/**/*.js',
    '!src/products/paylinq/**/*.test.js',
    '!src/products/paylinq/**/index.js'
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Coverage directory
  coverageDirectory: 'coverage/paylinq',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform
  transform: {},

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true
};
