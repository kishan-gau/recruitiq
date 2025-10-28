/**
 * Test script for enhanced authentication features
 * Tests: Token blacklist, account lockout, IP tracking, token rotation
 */

const BASE_URL = 'http://localhost:4000/api';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test data
const testUser = {
  email: 'test.auth@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Auth',
  organizationName: `Test Auth Org ${Date.now()}`
};

const testResults = [];
let testTokens = {};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${testName}`, color);
  if (details) {
    log(`  ${details}`, 'blue');
  }
  testResults.push({ testName, passed, details });
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { text: await response.text() };
    }

    return { response, data, status: response.status };
  } catch (error) {
    return { error: error.message, status: 0 };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Register user for testing
async function testRegisterUser() {
  log('\n📝 Test 1: Register test user', 'yellow');
  
  const { response, data, status } = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });

  const passed = status === 201 && data.accessToken && data.refreshToken;
  logTest('User registration', passed, `Status: ${status}`);

  if (passed) {
    testTokens.accessToken = data.accessToken;
    testTokens.refreshToken = data.refreshToken;
    testTokens.userId = data.user.id;
  }

  return passed;
}

// Test 2: Verify authentication works
async function testAuthenticationWorks() {
  log('\n🔐 Test 2: Verify authentication with valid token', 'yellow');
  
  const { response, data, status } = await makeRequest('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testTokens.accessToken}`,
    },
  });

  const passed = status === 200 && data.user;
  logTest('Authentication works', passed, `Status: ${status}, User: ${data.user?.email || 'N/A'}`);

  return passed;
}

// Test 3: Test account lockout after failed attempts
async function testAccountLockout() {
  log('\n🔒 Test 3: Test account lockout after failed login attempts', 'yellow');
  
  const wrongPassword = 'WrongPassword123!';
  let failedAttempts = 0;
  let lockedOut = false;

  // Try 6 failed login attempts (lockout at 5)
  for (let i = 0; i < 6; i++) {
    const { response, data, status } = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: wrongPassword,
      }),
    });

    if (status === 401) {
      failedAttempts++;
      if (data.message && data.message.includes('locked')) {
        lockedOut = true;
        break;
      }
    }

    // Small delay between attempts
    await sleep(500);
  }

  const passed = lockedOut && failedAttempts >= 5;
  logTest('Account lockout triggers', passed, 
    `Failed attempts: ${failedAttempts}, Locked: ${lockedOut}`);

  return passed;
}

// Test 4: Test progressive delay on failed attempts
async function testProgressiveDelay() {
  log('\n⏱️  Test 4: Verify progressive delay on failed attempts', 'yellow');
  
  const tempUser = {
    email: `delay.test${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };

  const timings = [];
  
  // Make 3 failed attempts and measure time
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(tempUser),
    });
    const end = Date.now();
    timings.push(end - start);
    await sleep(500); // Wait between attempts
  }

  // Later attempts should take progressively longer
  const increasingDelay = timings[2] >= timings[1] && timings[1] >= timings[0];
  
  logTest('Progressive delay works', increasingDelay, 
    `Delays: ${timings.map(t => `${t}ms`).join(', ')}`);

  return increasingDelay;
}

// Test 5: Test token rotation on refresh
async function testTokenRotation() {
  log('\n🔄 Test 5: Test refresh token rotation', 'yellow');
  
  // First, need to clear lockout from Test 3
  await sleep(5000); // Wait a bit
  
  // Login with correct password
  const { data: loginData } = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
  });

  if (!loginData.accessToken) {
    logTest('Token rotation setup', false, 'Failed to login for rotation test');
    return false;
  }

  const oldRefreshToken = loginData.refreshToken;

  // Wait a moment
  await sleep(1000);

  // Refresh the token
  const { response, data, status } = await makeRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: oldRefreshToken,
    }),
  });

  const passed = status === 200 && 
                 data.accessToken && 
                 data.refreshToken && 
                 data.refreshToken !== oldRefreshToken;

  logTest('Token rotation works', passed, 
    `New token issued: ${data.refreshToken ? 'Yes' : 'No'}, Different from old: ${data.refreshToken !== oldRefreshToken ? 'Yes' : 'No'}`);

  // Try to use old refresh token (should fail)
  await sleep(500);
  const { status: oldTokenStatus } = await makeRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: oldRefreshToken,
    }),
  });

  const oldTokenBlocked = oldTokenStatus === 401;
  logTest('Old refresh token blocked', oldTokenBlocked, 
    `Old token status: ${oldTokenStatus}`);

  // Update tokens for next tests
  if (passed) {
    testTokens.accessToken = data.accessToken;
    testTokens.refreshToken = data.refreshToken;
  }

  return passed && oldTokenBlocked;
}

// Test 6: Test token blacklist on logout
async function testTokenBlacklist() {
  log('\n🚫 Test 6: Test token blacklist on logout', 'yellow');
  
  // Logout (should blacklist tokens)
  const { status: logoutStatus } = await makeRequest('/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testTokens.accessToken}`,
    },
    body: JSON.stringify({
      refreshToken: testTokens.refreshToken,
    }),
  });

  const logoutWorked = logoutStatus === 200;
  logTest('Logout successful', logoutWorked, `Status: ${logoutStatus}`);

  // Try to use blacklisted access token
  await sleep(500);
  const { status: authStatus } = await makeRequest('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testTokens.accessToken}`,
    },
  });

  const accessTokenBlocked = authStatus === 401;
  logTest('Blacklisted access token rejected', accessTokenBlocked, 
    `Auth status: ${authStatus}`);

  // Try to refresh with blacklisted refresh token
  const { status: refreshStatus } = await makeRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: testTokens.refreshToken,
    }),
  });

  const refreshTokenBlocked = refreshStatus === 401;
  logTest('Blacklisted refresh token rejected', refreshTokenBlocked, 
    `Refresh status: ${refreshStatus}`);

  return logoutWorked && accessTokenBlocked && refreshTokenBlocked;
}

// Test 7: Test IP tracking
async function testIPTracking() {
  log('\n🌐 Test 7: Test IP tracking and anomaly detection', 'yellow');
  
  // Login to generate IP tracking data
  const { response, data, status } = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
  });

  const loginWorked = status === 200 && data.accessToken;
  logTest('Login for IP tracking', loginWorked, `Status: ${status}`);

  // Check if security notice is included (should be for first login or new IP)
  const hasSecurityInfo = data.securityNotice !== undefined;
  logTest('IP tracking data present', hasSecurityInfo, 
    hasSecurityInfo ? `Notice: ${data.securityNotice.message}` : 'No security notice');

  if (loginWorked) {
    testTokens.accessToken = data.accessToken;
    testTokens.refreshToken = data.refreshToken;
  }

  return loginWorked;
}

// Test 8: Verify authentication works after clearing lockout
async function testAuthenticationAfterLockout() {
  log('\n✅ Test 8: Verify authentication works after lockout cleared', 'yellow');
  
  const { response, data, status } = await makeRequest('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testTokens.accessToken}`,
    },
  });

  const passed = status === 200 && data.user && data.user.email === testUser.email;
  logTest('Authentication restored', passed, 
    `Status: ${status}, User: ${data.user?.email || 'N/A'}`);

  return passed;
}

// Main test runner
async function runTests() {
  log('='.repeat(60), 'blue');
  log('🧪 Enhanced Authentication Tests', 'blue');
  log('='.repeat(60), 'blue');

  try {
    await testRegisterUser();
    await testAuthenticationWorks();
    await testAccountLockout();
    await testProgressiveDelay();
    await testTokenRotation();
    await testTokenBlacklist();
    await testIPTracking();
    await testAuthenticationAfterLockout();

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    log('📊 Test Summary', 'blue');
    log('='.repeat(60), 'blue');

    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    const percentage = ((passed / total) * 100).toFixed(0);

    log(`\nTotal Tests: ${total}`, 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${total - passed}`, 'red');
    log(`Success Rate: ${percentage}%\n`, percentage === '100' ? 'green' : 'yellow');

    if (passed === total) {
      log('🎉 All tests passed!', 'green');
    } else {
      log('⚠️  Some tests failed. Review the results above.', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run tests
runTests();
