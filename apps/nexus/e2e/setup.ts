/**
 * Global E2E Test Setup
 * Starts backend server before running Nexus E2E tests
 * Mirrors backend/tests/e2e/setup.js pattern for architectural consistency
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

let serverProcess: ChildProcessWithoutNullStreams | null = null;

/**
 * Starts backend server before E2E tests
 * Server will use test database when NODE_ENV=e2e
 */
export default async function globalSetup() {
  console.log('🚀 Starting backend server for Nexus E2E tests...');

  return new Promise<void>((resolve, reject) => {
    // Navigate to backend directory
    const backendPath = join(__dirname, '../../../backend');
    const serverPath = join(backendPath, 'src/server.js');
    
    // Start server with e2e environment
    // Backend automatically loads .env.test when NODE_ENV=e2e
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'e2e',
        PORT: '3000', // Use port 3000 to match frontend expectations
      },
      cwd: backendPath,
      stdio: 'pipe',
    });

    let serverOutput = '';
    let serverReady = false;
    const startTime = Date.now();
    const timeout = 60000; // 60 second timeout

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      serverOutput += output;
      
      // Also output to console for debugging
      console.log('[Backend]', output.trim());
      
      // Look for server ready message
      if (output.includes('RecruitIQ API Server started') || 
          output.includes('Server running on port')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Backend server ready on port 3000');
          
          // Store PID for cleanup
          if (serverProcess?.pid) {
            (global as any).__SERVER_PID__ = serverProcess.pid;
          }
          
          // Give server a moment to fully initialize
          setTimeout(resolve, 2000);
        }
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      const errorOutput = data.toString();
      // Log all stderr output for debugging
      console.error('[Backend Error]', errorOutput.trim());
      
      // Only log if it's an actual error (not just debug output)
      if (errorOutput.includes('Error') || errorOutput.includes('error')) {
        console.error('Server error:', errorOutput);
      }
    });

    serverProcess.on('error', (error: Error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code: number | null) => {
      if (code !== 0 && !serverReady) {
        console.error('Server exited with code:', code);
        console.error('Server output:', serverOutput);
        reject(new Error(`Server failed to start. Exit code: ${code}`));
      }
    });

    // Timeout if server doesn't start
    const timeoutId = setTimeout(() => {
      if (!serverReady) {
        console.error('Server startup timeout after 60s');
        console.error('Server output:', serverOutput);
        serverProcess?.kill();
        reject(new Error('Server startup timeout'));
      }
    }, timeout);

    // Clean up timeout if we resolve
    const originalResolve = resolve;
    resolve = (...args) => {
      clearTimeout(timeoutId);
      originalResolve(...args);
    };
  });
}
