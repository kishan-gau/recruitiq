/**
 * Global E2E Test Setup
 * Starts the backend server before E2E tests run
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess = null;

/**
 * Checks if server is responding to HTTP requests
 */
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:4000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Polls health endpoint until server is ready
 */
async function waitForServer(timeoutMs = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await checkServerHealth()) {
      return true;
    }
    
    // Wait 500ms before next check
    await new Promise(r => setTimeout(r, 500));
  }
  
  return false;
}

export default async function globalSetup() {
  console.log('🚀 Starting backend server for E2E tests...');

  return new Promise(async (resolve, reject) => {
    const serverPath = join(__dirname, '../../src/server.js');
    
    // Start server with e2e environment
    // Config will automatically load .env.test when NODE_ENV=e2e
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'e2e',
        PORT: '4000'
      },
      stdio: 'inherit' // Use inherit to see server logs in test output
    });

    let serverReady = false;

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !serverReady) {
        console.error('Server exited with code:', code);
        reject(new Error(`Server failed to start. Exit code: ${code}`));
      }
    });

    // Wait for server to be ready via health check
    try {
      const ready = await waitForServer(30000);
      
      if (ready) {
        serverReady = true;
        console.log('✅ Backend server ready on port 4000');
        
        // Store PID for cleanup
        global.__SERVER_PID__ = serverProcess.pid;
        
        // Give server a moment to fully initialize
        await new Promise(r => setTimeout(r, 1000));
        resolve();
      } else {
        serverProcess.kill();
        reject(new Error('Server health check timeout after 30 seconds'));
      }
    } catch (error) {
      serverProcess.kill();
      reject(error);
    }
  });
}
