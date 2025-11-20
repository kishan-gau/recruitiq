/**
 * Jest E2E Environment Setup
 * Sets environment variables for the Jest test process
 * This ensures test database is used when importing database config
 */

// Force test database for Jest test process
process.env.NODE_ENV = 'e2e';
process.env.DATABASE_NAME = 'recruitiq_test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/recruitiq_test';

console.log('📝 Jest E2E environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_NAME: process.env.DATABASE_NAME
});
