/**
 * Jest Setup for ScheduleHub Integration Tests
 * Runs before each test file
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-integration-tests';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting ScheduleHub Integration Tests');
});

afterAll(() => {
  console.log('✅ Completed ScheduleHub Integration Tests');
});
