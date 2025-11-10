/**
 * Jest Configuration for ScheduleHub Integration Tests
 */

export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/products/schedulehub/integration/**/*.test.js'],
  collectCoverageFrom: [
    'src/products/schedulehub/**/*.js',
    '!src/products/schedulehub/**/*.test.js'
  ],
  coverageDirectory: 'coverage/schedulehub-integration',
  setupFilesAfterEnv: ['<rootDir>/tests/products/schedulehub/integration/jest.setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {},
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 1, // Run tests serially to avoid database conflicts
  verbose: true
};
