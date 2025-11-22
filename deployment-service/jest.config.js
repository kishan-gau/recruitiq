/**
 * Jest Configuration for Deployment Service
 * 
 * ES Modules configuration with proper coverage and test patterns
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // ES Modules support (no transform)
  transform: {},
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js',
    '!src/database/migrate.js',
    '!src/database/seed.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Module name mapper (for path aliases if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
