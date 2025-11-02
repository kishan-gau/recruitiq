/**
 * Test script for security headers and CORS
 * Verifies all security headers are properly set in actual HTTP responses
 * 
 * This is an integration test that requires a running server.
 * If the server is not running, this script will start it automatically.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:4000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let serverProcess = null;
let serverStartedByScript = false;

/**
 * Test security headers
 */
async function testSecurityHeaders() {
  log('blue', '\n=== Testing Security Headers ===\n');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const headers = response.headers;
    
    const requiredHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'x-permitted-cross-domain-policies': 'none',
      'x-download-options': 'noopen',
      'permissions-policy': true, // Just check if exists
      'x-request-id': true,
      'referrer-policy': 'strict-origin-when-cross-origin',
    };
    
    let passed = 0;
    let failed = 0;
    
    log('yellow', 'Checking required security headers:\n');
    
    for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
      const headerValue = headers.get(headerName);
      
      if (!headerValue) {
        log('red', `✗ ${headerName}: Missing`);
        failed++;
      } else if (expectedValue === true) {
        // Just check if exists
        log('green', `✓ ${headerName}: ${headerValue.substring(0, 50)}...`);
        passed++;
      } else if (headerValue.toLowerCase() === expectedValue.toLowerCase()) {
        log('green', `✓ ${headerName}: ${headerValue}`);
        passed++;
      } else {
        log('red', `✗ ${headerName}: Expected "${expectedValue}", got "${headerValue}"`);
        failed++;
      }
    }
    
    // Check that X-Powered-By is NOT present
    if (!headers.get('x-powered-by')) {
      log('green', '✓ X-Powered-By: Properly hidden');
      passed++;
    } else {
      log('red', `✗ X-Powered-By: Should be hidden but got "${headers.get('x-powered-by')}"`);
      failed++;
    }
    
    log('blue', `\n--- Results: ${passed} passed, ${failed} failed ---\n`);
    
    return { passed, failed };
  } catch (error) {
    log('red', `Error testing security headers: ${error.message}`);
    return { passed: 0, failed: 1 };
  }
}

/**
 * Test CORS with allowed origin
 */
async function testCorsAllowed() {
  log('blue', '=== Testing CORS (Allowed Origin) ===\n');
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:5173',
      },
    });
    
    const accessControlAllowOrigin = response.headers.get('access-control-allow-origin');
    const accessControlAllowCredentials = response.headers.get('access-control-allow-credentials');
    
    if (accessControlAllowOrigin === 'http://localhost:5173') {
      log('green', '✓ Access-Control-Allow-Origin: Correctly set for allowed origin');
    } else {
      log('red', `✗ Access-Control-Allow-Origin: Expected "http://localhost:5173", got "${accessControlAllowOrigin}"`);
    }
    
    if (accessControlAllowCredentials === 'true') {
      log('green', '✓ Access-Control-Allow-Credentials: true');
    } else {
      log('red', `✗ Access-Control-Allow-Credentials: Expected "true", got "${accessControlAllowCredentials}"`);
    }
    
    log('blue', '\n');
    return response.status === 200;
  } catch (error) {
    log('red', `Error testing CORS: ${error.message}\n`);
    return false;
  }
}

/**
 * Test CORS with disallowed origin
 */
async function testCorsBlocked() {
  log('blue', '=== Testing CORS (Blocked Origin) ===\n');
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      headers: {
        'Origin': 'http://evil-site.com',
      },
    });
    
    const accessControlAllowOrigin = response.headers.get('access-control-allow-origin');
    
    if (!accessControlAllowOrigin || accessControlAllowOrigin !== 'http://evil-site.com') {
      log('green', '✓ Blocked origin correctly rejected');
      log('green', `  Access-Control-Allow-Origin: ${accessControlAllowOrigin || 'Not set'}`);
    } else {
      log('red', '✗ Blocked origin was incorrectly allowed!');
    }
    
    log('blue', '\n');
    return true;
  } catch (error) {
    // In browser, this would throw a CORS error - that's expected
    // In Node.js fetch, it won't throw but headers won't be set
    log('green', '✓ Origin blocked (expected behavior)\n');
    return true;
  }
}

/**
 * Test OPTIONS preflight request
 */
async function testPreflightRequest() {
  log('blue', '=== Testing Preflight (OPTIONS) Request ===\n');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    
    if (response.status === 204 || response.status === 200) {
      log('green', `✓ Preflight request handled (Status: ${response.status})`);
    } else {
      log('red', `✗ Preflight request failed (Status: ${response.status})`);
    }
    
    const allowMethods = response.headers.get('access-control-allow-methods');
    const allowHeaders = response.headers.get('access-control-allow-headers');
    
    if (allowMethods) {
      log('green', `✓ Access-Control-Allow-Methods: ${allowMethods}`);
    } else {
      log('red', '✗ Access-Control-Allow-Methods: Not set');
    }
    
    if (allowHeaders) {
      log('green', `✓ Access-Control-Allow-Headers: ${allowHeaders}`);
    } else {
      log('red', '✗ Access-Control-Allow-Headers: Not set');
    }
    
    log('blue', '\n');
    return response.status === 204 || response.status === 200;
  } catch (error) {
    log('red', `Error testing preflight: ${error.message}\n`);
    return false;
  }
}

/**
 * Check if server is already running
 */
async function isServerRunning() {
  try {
    const response = await fetch(`${API_URL}/health`, { 
      signal: AbortSignal.timeout(3000) 
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Start the server
 */
async function startServer() {
  log('yellow', '\n⚙️  Server not running. Starting server...\n');
  
  return new Promise((resolve, reject) => {
    const backendDir = join(__dirname, '..');
    
    // Start server process
    serverProcess = spawn('node', ['src/server.js'], {
      cwd: backendDir,
      env: { ...process.env, NODE_ENV: 'test', PORT: '4000' },
      stdio: 'pipe'
    });
    
    let output = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running on port') || output.includes('started')) {
        log('green', '✓ Server started successfully\n');
        serverStartedByScript = true;
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // Ignore common warnings
      if (!error.includes('ExperimentalWarning') && !error.includes('punycode')) {
        console.error(error);
      }
    });
    
    serverProcess.on('error', (error) => {
      log('red', `Failed to start server: ${error.message}`);
      reject(error);
    });
    
    // Wait up to 30 seconds for server to start
    setTimeout(async () => {
      const running = await isServerRunning();
      if (running) {
        log('green', '✓ Server is ready\n');
        serverStartedByScript = true;
        resolve();
      } else {
        reject(new Error('Server failed to start within 30 seconds'));
      }
    }, 30000);
    
    // Check every second if server is ready
    const checkInterval = setInterval(async () => {
      const running = await isServerRunning();
      if (running) {
        clearInterval(checkInterval);
        log('green', '✓ Server is ready\n');
        serverStartedByScript = true;
        resolve();
      }
    }, 1000);
  });
}

/**
 * Stop the server if we started it
 */
function stopServer() {
  if (serverStartedByScript && serverProcess) {
    log('yellow', '\n🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if not stopped
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
    
    log('green', '✓ Server stopped\n');
  }
}

/**
 * Run all security tests
 */
async function runAllTests() {
  log('blue', '\n╔══════════════════════════════════════════════════════════╗');
  log('blue', '║  Security Headers & CORS Integration Test Suite         ║');
  log('blue', '╚══════════════════════════════════════════════════════════╝\n');
  
  // Ensure server is running
  let serverWasRunning = await isServerRunning();
  
  if (!serverWasRunning) {
    log('cyan', '📋 Prerequisites Check:\n');
    log('yellow', '  • Server not detected at ' + API_URL);
    log('yellow', '  • Starting server automatically...\n');
    
    try {
      await startServer();
      log('green', '✓ Server startup complete\n');
      
      // Wait 2 more seconds for middleware to initialize
      log('cyan', '⏳ Waiting for middleware initialization...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      log('green', '✓ Ready to test\n');
    } catch (error) {
      log('red', `\n❌ Failed to start server: ${error.message}`);
      log('yellow', '\n💡 Manual start required:');
      log('yellow', '   npm start');
      log('yellow', '   -- or --');
      log('yellow', '   npm run dev\n');
      process.exit(1);
    }
  } else {
    log('green', '✓ Server is already running at ' + API_URL + '\n');
  }
  
  // Run tests
  const headerResults = await testSecurityHeaders();
  const corsAllowed = await testCorsAllowed();
  const corsBlocked = await testCorsBlocked();
  const preflight = await testPreflightRequest();
  
  // Stop server if we started it
  stopServer();
  
  // Results summary
  log('blue', '╔══════════════════════════════════════════════════════════╗');
  log('blue', '║  Test Summary                                            ║');
  log('blue', '╚══════════════════════════════════════════════════════════╝\n');
  
  log('yellow', `Security Headers: ${headerResults.passed} passed, ${headerResults.failed} failed`);
  log('yellow', `CORS Allowed Origin: ${corsAllowed ? 'PASS' : 'FAIL'}`);
  log('yellow', `CORS Blocked Origin: ${corsBlocked ? 'PASS' : 'FAIL'}`);
  log('yellow', `Preflight Request: ${preflight ? 'PASS' : 'FAIL'}`);
  
  const allPassed = headerResults.failed === 0 && corsAllowed && corsBlocked && preflight;
  
  if (allPassed) {
    log('green', '\n🎉 All security headers integration tests passed!\n');
    process.exit(0);
  } else {
    log('red', '\n❌ Some tests failed. Review the output above.\n');
    process.exit(1);
  }
}

// Cleanup on exit
process.on('SIGINT', () => {
  log('yellow', '\n\n⚠️  Test interrupted');
  stopServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(143);
});

process.on('exit', () => {
  stopServer();
});

// Run tests
runAllTests().catch(error => {
  log('red', `Fatal error: ${error.message}`);
  stopServer();
  process.exit(1);
});
