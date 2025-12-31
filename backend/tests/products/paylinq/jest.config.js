/**
 * Jest Configuration for Paylinq Tests
 * 
 * Test configuration for the Paylinq product.
 */

export default {
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
  coverageThreshold: {
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
  setupFilesAfterEnv: ['<rootDir>/../../../tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Module name mapper for .js -> .ts resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Enable ES modules support
  extensionsToTreatAsEsm: ['.ts'],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },

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
