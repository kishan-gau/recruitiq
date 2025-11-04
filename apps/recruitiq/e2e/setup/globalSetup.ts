/**
 * Global Setup for E2E Tests
 * 
 * This runs ONCE before all tests to ensure:
 * 1. Backend server is running
 * 2. Database has test data seeded
 * 3. Test user exists and can authenticate
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

const BACKEND_URL = 'http://localhost:4000';
const BACKEND_PATH = join(process.cwd(), '..', 'backend');

/**
 * Check if backend server is running
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for backend to be ready
 */
async function waitForBackend(maxAttempts = 30, intervalMs = 1000): Promise<void> {
  console.log('⏳ Waiting for backend server...');
  
  for (let i = 0; i < maxAttempts; i++) {
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      console.log('✓ Backend server is ready\n');
      return;
    }
    
    if (i === 0) {
      console.log(`   Checking ${BACKEND_URL}/health...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(
    `Backend server not responding at ${BACKEND_URL}\n` +
    `Please start the backend server:\n` +
    `  cd backend\n` +
    `  npm run dev`
  );
}

/**
 * Seed test data in the database
 */
async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...');
  
  try {
    const { stdout, stderr } = await execAsync(
      'node src/database/seed-test-data.js',
      { cwd: BACKEND_PATH }
    );
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✓ Test data seeded successfully\n');
  } catch (error) {
    const err = error as any;
    console.error('✗ Failed to seed test data:');
    console.error(err.stdout || err.message);
    throw new Error(
      'Failed to seed test data. Make sure PostgreSQL is running and backend .env is configured correctly.'
    );
  }
}

/**
 * Verify test user can authenticate
 */
async function verifyTestUser(): Promise<void> {
  console.log('🔐 Verifying test user authentication...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@recruitiq.com',
        password: 'TestPassword123!'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Login failed: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.accessToken) {
      throw new Error('No access token received');
    }

    console.log('✓ Test user authentication verified');
    console.log(`  Email: test@recruitiq.com`);
    console.log(`  Role: ${data.user?.role}\n`);
    
  } catch (error) {
    const err = error as Error;
    console.error('✗ Test user authentication failed:', err.message);
    throw new Error(
      'Test user authentication failed. This usually means:\n' +
      '  1. Test data was not seeded correctly\n' +
      '  2. Database connection failed\n' +
      '  3. Backend auth endpoints are not working'
    );
  }
}

/**
 * Main setup function
 */
export default async function globalSetup() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  E2E Test Environment Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Ensure backend is running
    await waitForBackend();

    // Step 2: Seed test data
    await seedTestData();

    // Step 3: Verify test user can authenticate
    await verifyTestUser();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test environment ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    const err = error as Error;
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Test environment setup failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`\n${err.message}\n`);
    throw error;
  }
}
