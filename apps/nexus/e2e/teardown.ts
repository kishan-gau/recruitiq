/**
 * Global E2E Test Teardown
 * Stops backend server after Nexus E2E tests complete
 * Mirrors backend/tests/e2e/teardown.js pattern for architectural consistency
 */

import { execSync } from 'child_process';

/**
 * Stops backend server after E2E tests
 * Platform-aware cleanup for Windows and Unix systems
 */
export default async function globalTeardown() {
  console.log('🛑 Stopping backend server...');
  
  const serverPid = (global as any).__SERVER_PID__;
  
  if (serverPid) {
    try {
      // Platform-specific process termination
      if (process.platform === 'win32') {
        // Windows: Use taskkill to terminate process tree
        execSync(`taskkill /pid ${serverPid} /T /F`, { stdio: 'ignore' });
        console.log('✅ Backend server stopped (Windows)');
      } else {
        // Unix/Linux/Mac: Use SIGTERM signal
        process.kill(serverPid, 'SIGTERM');
        console.log('✅ Backend server stopped (Unix)');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error stopping server:', error.message);
      } else {
        console.error('Error stopping server:', error);
      }
      // Don't throw - we want tests to report their results even if cleanup fails
    }
  } else {
    console.warn('⚠️  No server PID found - server may not have started');
  }
}
