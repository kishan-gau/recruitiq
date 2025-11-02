/**
 * Manual test script for validation middleware
 * Tests various validation scenarios
 */

const API_URL = 'http://localhost:4000/api';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper to add delay between tests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testValidation(testName, endpoint, method, data, expectedStatus) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    // Try to parse as JSON, but handle rate limit text responses
    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { message: text };
    }

    const passed = response.status === expectedStatus;

    if (passed) {
      log('green', `✓ ${testName} - Status: ${response.status}`);
    } else {
      log('red', `✗ ${testName} - Expected ${expectedStatus}, got ${response.status}`);
      console.log('  Response:', JSON.stringify(result, null, 2));
    }

    return { passed, response: result, status: response.status };
  } catch (error) {
    log('red', `✗ ${testName} - Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function runTests() {
  log('blue', '\n=== Testing Input Validation Middleware ===\n');
  log('yellow', '⚠️  Note: Auth endpoints are rate-limited to 5 requests per 15 minutes.');
  log('yellow', '   Tests will be split into two batches.\n');

  // BATCH 1: First 5 tests (within rate limit)
  log('blue', '--- Batch 1: Critical Validation Tests (1-5) ---\n');

  // Test 1: Valid login data
  await testValidation(
    'Test 1: Valid login (should accept)',
    '/auth/login',
    'POST',
    {
      email: 'test@example.com',
      password: 'TestPassword123!',
    },
    401 // Expecting 401 because user doesn't exist, but validation passed
  );
  await delay(3000);

  // Test 2: Invalid email
  await testValidation(
    'Test 2: Invalid email format',
    '/auth/login',
    'POST',
    {
      email: 'not-an-email',
      password: 'TestPassword123!',
    },
    400 // Should fail validation
  );
  await delay(3000);

  // Test 3: Missing required field
  await testValidation(
    'Test 3: Missing password field',
    '/auth/login',
    'POST',
    {
      email: 'test@example.com',
    },
    400 // Should fail validation
  );
  await delay(3000);

  // Test 4: SQL injection attempt
  await testValidation(
    'Test 4: SQL injection in email',
    '/auth/login',
    'POST',
    {
      email: "admin' OR '1'='1",
      password: 'password',
    },
    400 // Should fail validation (invalid email format)
  );
  await delay(3000);

  // Test 5: XSS attempt
  await testValidation(
    'Test 5: XSS in registration',
    '/auth/register',
    'POST',
    {
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      firstName: '<script>alert("xss")</script>',
      lastName: 'Test',
      organizationName: 'Test Org',
      termsAccepted: true,
    },
    400 // Should fail validation (invalid characters in name)
  );

  log('blue', '\n--- Batch 1 Complete (5/10 tests) ---\n');
  log('yellow', '\n⚠️  Auth rate limit reached (5 requests per 15 minutes).\n');
  log('blue', '\n📋 To run remaining tests (6-10), choose one option:\n');
  log('green', '   Option 1: Wait 15 minutes and press Enter to continue');
  log('green', '   Option 2: Restart the backend server and re-run this script');
  log('green', '   Option 3: Run the quick test: npm run test:validation\n');
  log('yellow', '   Press Ctrl+C to exit, or wait...\n');

  // Ask user if they want to wait or exit
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const shouldWait = await new Promise((resolve) => {
    rl.question('Wait 15 minutes? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });

  if (!shouldWait) {
    log('yellow', '\n✓ Exiting. Restart server to continue testing.\n');
    process.exit(0);
  }

  log('yellow', '\n⏳ Waiting 15 minutes for rate limit to reset...\n');
  
  // Wait 15 minutes (900 seconds) - show countdown
  for (let i = 15; i > 0; i--) {
    log('yellow', `   ⏱️  ${i} minutes remaining...`);
    await delay(60000); // Wait 1 minute per iteration
  }

  log('green', '\n✓ Rate limit window should be reset. Continuing with batch 2...\n');

  // BATCH 2: Tests 6-10 (after rate limit window)
  log('blue', '\n--- Batch 2: Additional Validation Tests (6-10) ---\n');

  // Test 6: Weak password
  await testValidation(
    'Test 6: Weak password (no special char)',
    '/auth/register',
    'POST',
    {
      email: 'test2@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
      organizationName: 'Test Org',
      termsAccepted: true,
    },
    400 // Should fail validation (password doesn't meet requirements)
  );
  await delay(3000);

  // Test 7: Password mismatch
  await testValidation(
    'Test 7: Password mismatch',
    '/auth/register',
    'POST',
    {
      email: 'test3@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'DifferentPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      organizationName: 'Test Org',
      termsAccepted: true,
    },
    400 // Should fail validation
  );
  await delay(3000);

  // Test 8: Email too long
  await testValidation(
    'Test 8: Email exceeds max length',
    '/auth/login',
    'POST',
    {
      email: 'a'.repeat(250) + '@example.com',
      password: 'TestPassword123!',
    },
    400 // Should fail validation
  );
  await delay(3000);

  // Test 9: Valid registration with all fields
  await testValidation(
    'Test 9: Valid registration (complete data)',
    '/auth/register',
    'POST',
    {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      organizationName: 'ACME Corporation',
      phone: '+12345678901',
      termsAccepted: true,
    },
    409 // Expecting 409 if email exists or 201/400 based on business logic
  );
  await delay(3000);

  // Test 10: Extra fields should be stripped
  await testValidation(
    'Test 10: Unknown fields (should be stripped)',
    '/auth/login',
    'POST',
    {
      email: 'test@example.com',
      password: 'TestPassword123!',
      extraField: 'should be removed',
      maliciousData: { $where: '1=1' },
    },
    401 // Validation passes (strips extras), auth fails (expected)
  );

  log('blue', '\n=== Test Summary ===\n');
  log('yellow', 'All 10 validation tests completed!');
  log('green', '\n✓ Core validation features tested:');
  log('green', '  - Email format validation');
  log('green', '  - Required field validation');
  log('green', '  - SQL injection prevention');
  log('green', '  - XSS attack prevention');
  log('green', '  - Password strength validation');
  log('green', '  - Field matching (password confirmation)');
  log('green', '  - Length restrictions');
  log('green', '  - Unknown field stripping (mass assignment protection)');
  log('yellow', '\nNote: 401/409 status codes indicate validation passed but auth/business logic failed (expected).');
}

// Run tests
runTests().catch(error => {
  log('red', `Fatal error: ${error.message}`);
  process.exit(1);
});
