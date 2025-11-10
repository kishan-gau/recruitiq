/**
 * Jest Configuration for ScheduleHub Tests
 */

export default {
  displayName: 'ScheduleHub',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/products/schedulehub/**/*.test.js'
  ],
  coverageDirectory: 'coverage/schedulehub',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/products/schedulehub/factories/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/products/schedulehub/setup.js'],
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
