#!/usr/bin/env node

/**
 * Docker Container Entry Point
 * 
 * Industry-standard Node.js entry point for containerized backend
 * Handles:
 * - Database connection waiting
 * - Automatic migrations
 * - Development seeds (optional)
 * - Graceful startup/shutdown
 * 
 * Based on best practices from:
 * - Node.js Docker Best Practices
 * - 12-Factor App methodology
 * - Production-ready Node.js patterns
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

/**
 * Wait for PostgreSQL to be ready
 */
async function waitForPostgres() {
  log('⏳', 'Waiting for PostgreSQL...', colors.yellow);
  
  const maxRetries = 30;
  const retryDelay = 2000; // 2 seconds
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await execAsync('pg_isready -h postgres -p 5432 -U postgres');
      log('✅', 'PostgreSQL is ready!', colors.green);
      return;
    } catch (error) {
      if (i < maxRetries - 1) {
        log('  ', `PostgreSQL not ready, retrying in ${retryDelay / 1000}s... (${i + 1}/${maxRetries})`, colors.yellow);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        log('❌', 'PostgreSQL failed to become ready', colors.red);
        process.exit(1);
      }
    }
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  log('📊', 'Running database migrations...', colors.cyan);
  
  try {
    const { stdout, stderr } = await execAsync('npm run migrate:latest', {
      cwd: '/app/backend',
      env: { ...process.env }
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    log('✅', 'Migrations completed successfully', colors.green);
  } catch (error) {
    log('❌', `Migration failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Run database seeds (development only)
 */
async function runSeeds() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  log('🌱', 'Checking if seeds are needed...', colors.cyan);
  
  try {
    // Check if organizations table has data
    const { stdout } = await execAsync(
      'psql -h postgres -U postgres -d recruitiq_dev -t -c "SELECT COUNT(*) FROM organizations;"',
      { env: { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD || 'postgres' } }
    );
    
    const orgCount = parseInt(stdout.trim());
    
    if (orgCount === 0) {
      log('🌱', 'Running database seeds...', colors.cyan);
      const { stdout: seedOut, stderr: seedErr } = await execAsync('npm run seed', {
        cwd: '/app/backend'
      });
      
      if (seedOut) console.log(seedOut);
      if (seedErr) console.error(seedErr);
      
      log('✅', 'Seeds completed successfully', colors.green);
    } else {
      log('ℹ️ ', 'Database already has data, skipping seeds', colors.cyan);
    }
  } catch (error) {
    log('⚠️ ', `Seed check/execution warning: ${error.message}`, colors.yellow);
    // Don't fail startup on seed errors in dev
  }
}

/**
 * Start the development server
 */
function startServer() {
  log('🎯', 'Starting development server...', colors.bright + colors.green);
  
  // Spawn npm run dev as child process
  const server = spawn('npm', ['run', 'dev'], {
    cwd: '/app/backend',
    stdio: 'inherit', // Pass through stdout/stderr
    env: { ...process.env }
  });
  
  // Forward signals to child process for graceful shutdown
  process.on('SIGTERM', () => {
    log('🛑', 'Received SIGTERM, shutting down gracefully...', colors.yellow);
    server.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    log('🛑', 'Received SIGINT, shutting down gracefully...', colors.yellow);
    server.kill('SIGINT');
  });
  
  server.on('exit', (code, signal) => {
    log('📴', `Server process exited with code ${code} and signal ${signal}`, colors.yellow);
    process.exit(code || 0);
  });
}

/**
 * Main entry point
 */
async function main() {
  try {
    log('🚀', 'Starting RecruitIQ Backend...', colors.bright + colors.cyan);
    
    // Step 1: Wait for PostgreSQL
    await waitForPostgres();
    
    // Step 2: Run migrations
    await runMigrations();
    
    // Step 3: Run seeds (dev only)
    await runSeeds();
    
    // Step 4: Start server
    startServer();
    
  } catch (error) {
    log('❌', `Startup failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();
