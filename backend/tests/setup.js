/**
 * Global Test Setup
 * 
 * This file runs once before all tests.
 * Use it for global configuration that applies to all tests.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables first
config({ path: join(__dirname, '../.env.test') });

// Set NODE_ENV to test if not already set
process.env.NODE_ENV = 'test';

// Suppress console output in tests unless VERBOSE=true
if (!process.env.VERBOSE) {
  const originalConsole = console;
  global.console = {
    ...console,
    log: () => {},
    info: () => {},
    debug: () => {},
    // Keep error and warn for debugging
    error: originalConsole.error,
    warn: originalConsole.warn,
  };
}

console.error('🧪 Jest global setup complete');

export default async function globalSetup() {
  // Any async setup can go here
}
