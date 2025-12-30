export default {
  // Use node environment for testing
  testEnvironment: 'node',

  // Enable ES modules support
  extensionsToTreatAsEsm: ['.ts'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@dto/(.*)$': '<rootDir>/src/dto/$1',
    '^@products/(.*)$': '<rootDir>/src/products/$1',
  },

  // Global setup and teardown
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',

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

