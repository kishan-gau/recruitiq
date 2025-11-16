/**
 * Global E2E Test Teardown
 * Stops the backend server after E2E tests complete
 */

export default async function globalTeardown() {
  console.log('🛑 Stopping backend server...');

  const serverPid = global.__SERVER_PID__;

  if (serverPid) {
    try {
      // On Windows, use taskkill; on Unix, use kill
      if (process.platform === 'win32') {
        const { execSync } = await import('child_process');
        // Force kill the process tree (includes child processes)
        execSync(`taskkill /pid ${serverPid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(serverPid, 'SIGTERM');
      }
      
      console.log('✅ Backend server stopped');
    } catch (error) {
      console.error('Error stopping server:', error.message);
      // Don't fail tests if cleanup fails
    }
  } else {
    console.log('⚠️  No server PID found to stop');
  }

  // Give processes time to clean up
  await new Promise(resolve => setTimeout(resolve, 1000));
}
