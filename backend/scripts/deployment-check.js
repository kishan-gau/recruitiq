#!/usr/bin/env node

/**
 * Production Deployment Readiness Check
 * 
 * This script validates that all requirements for production deployment are met.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

const checks = [];
let hasErrors = false;

function check(name, condition, errorMessage, isWarning = false) {
  const status = condition ? '✅' : (isWarning ? '⚠️ ' : '❌');
  const result = { name, passed: condition, isWarning, message: errorMessage };
  
  checks.push(result);
  
  if (!condition && !isWarning) {
    hasErrors = true;
  }
  
  console.log(`${status} ${name}`);
  if (!condition && errorMessage) {
    console.log(`   ${errorMessage}`);
  }
}

console.log('\n🔍 Checking Production Deployment Readiness...\n');
console.log('='.repeat(60));
console.log('\n📋 Environment Configuration\n');

// Check Node version
const nodeVersion = process.version;
const minNodeVersion = '18.0.0';
check(
  'Node.js Version',
  nodeVersion >= `v${minNodeVersion}`,
  `Node.js ${minNodeVersion}+ required. Current: ${nodeVersion}`
);

// Check environment variables
check(
  'NODE_ENV',
  process.env.NODE_ENV === 'production',
  'NODE_ENV should be set to "production"'
);

check(
  'PORT',
  !!process.env.PORT,
  'PORT is not set (will default to 4000)',
  true
);

console.log('\n🔐 Security Configuration\n');

// JWT Secret
check(
  'JWT_SECRET',
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
  'JWT_SECRET must be at least 32 characters'
);

check(
  'JWT_REFRESH_SECRET',
  process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length >= 32,
  'JWT_REFRESH_SECRET must be at least 32 characters'
);

check(
  'SESSION_SECRET',
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
  'SESSION_SECRET must be at least 32 characters',
  true
);

// Check HTTPS enforcement
check(
  'HTTPS Enforcement',
  process.env.REQUIRE_HTTPS === 'true',
  'REQUIRE_HTTPS should be true in production',
  true
);

console.log('\n🗄️  Database Configuration\n');

// Database
check(
  'Database URL',
  !!process.env.DATABASE_URL || !!process.env.DATABASE_HOST,
  'DATABASE_URL or DATABASE_HOST must be set'
);

check(
  'Database SSL',
  process.env.DATABASE_SSL === 'true',
  'DATABASE_SSL should be true in production',
  true
);

console.log('\n🌐 Frontend Configuration\n');

// Frontend
check(
  'Frontend URL',
  !!process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('https'),
  'FRONTEND_URL should start with https:// in production'
);

check(
  'Allowed Origins',
  !!process.env.ALLOWED_ORIGINS,
  'ALLOWED_ORIGINS should be configured'
);

console.log('\n📧 Optional Services\n');

// Optional but recommended
check(
  'Email Configuration',
  !!process.env.SMTP_HOST,
  'Email not configured (optional)',
  true
);

check(
  'Redis Configuration',
  !!process.env.REDIS_URL,
  'Redis not configured (optional but recommended for scaling)',
  true
);

check(
  'Error Tracking',
  !!process.env.SENTRY_DSN,
  'Sentry not configured (recommended for production)',
  true
);

check(
  'File Storage',
  !!process.env.AWS_S3_BUCKET,
  'AWS S3 not configured (optional)',
  true
);

console.log('\n📦 Dependencies\n');

// Check if node_modules exists
const nodeModulesExists = fs.existsSync(path.join(__dirname, '../node_modules'));
check(
  'Dependencies Installed',
  nodeModulesExists,
  'Run "npm ci --production" to install dependencies'
);

// Check if production dependencies are up to date
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);
const lockFileExists = fs.existsSync(path.join(__dirname, '../package-lock.json'));
check(
  'Lock File Exists',
  lockFileExists,
  'package-lock.json should exist for reproducible builds'
);

console.log('\n🔒 Security Audit\n');

// Check for vulnerabilities (simplified check)
console.log('   Run "npm audit" to check for known vulnerabilities');
console.log('   Run "npm audit fix" to automatically fix issues\n');

console.log('\n📁 Required Files\n');

// Check required files exist
const requiredFiles = [
  'src/server.js',
  'src/config/index.js',
  'src/config/database.js',
  '.env.production.example'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  check(
    `File: ${file}`,
    fs.existsSync(filePath),
    `Required file missing: ${file}`
  );
});

console.log('\n='.repeat(60));
console.log('\n📊 Summary\n');

const passed = checks.filter(c => c.passed).length;
const warnings = checks.filter(c => !c.passed && c.isWarning).length;
const errors = checks.filter(c => !c.passed && !c.isWarning).length;

console.log(`✅ Passed: ${passed}/${checks.length}`);
if (warnings > 0) {
  console.log(`⚠️  Warnings: ${warnings}`);
}
if (errors > 0) {
  console.log(`❌ Errors: ${errors}`);
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ Deployment check FAILED');
  console.log('   Please fix the errors above before deploying to production.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Deployment check PASSED with warnings');
  console.log('   Review the warnings above. You can deploy, but some features may not work.\n');
  process.exit(0);
} else {
  console.log('\n✅ Deployment check PASSED');
  console.log('   All checks passed! Ready for production deployment.\n');
  console.log('   Next steps:');
  console.log('   1. Run: npm run build:check');
  console.log('   2. Deploy to your chosen platform');
  console.log('   3. Run migrations: npm run migrate');
  console.log('   4. Verify health check: curl https://your-api.com/health\n');
  process.exit(0);
}
