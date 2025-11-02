#!/usr/bin/env node

/**
 * Security Audit Script
 * 
 * Performs various security checks on the codebase before deployment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔒 RecruitIQ Security Audit\n');
console.log('='.repeat(60));

let issuesFound = 0;
const warnings = [];
const errors = [];

function logIssue(level, category, message) {
  const icon = level === 'error' ? '❌' : '⚠️ ';
  console.log(`${icon} [${category}] ${message}`);
  
  if (level === 'error') {
    errors.push({ category, message });
    issuesFound++;
  } else {
    warnings.push({ category, message });
  }
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

// 1. Check for hardcoded secrets
console.log('\n📝 Checking for hardcoded secrets...\n');

const dangerousPatterns = [
  { pattern: /(password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/, name: 'Hardcoded password' },
  { pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{10,}['"]/, name: 'Hardcoded API key' },
  { pattern: /(secret|token)\s*[:=]\s*['"][^'"]{20,}['"]/, name: 'Hardcoded secret' },
  { pattern: /sk_live_[a-zA-Z0-9]{20,}/, name: 'Stripe live secret key' },
  { pattern: /pk_live_[a-zA-Z0-9]{20,}/, name: 'Stripe live publishable key' },
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
];

const filesToCheck = [];
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      filesToCheck.push(filePath);
    }
  });
}

const srcDir = path.join(__dirname, '../src');
if (fs.existsSync(srcDir)) {
  scanDirectory(srcDir);
}

let secretsFound = false;
filesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  dangerousPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(content)) {
      logIssue('error', 'SECRETS', `${name} found in ${path.relative(__dirname, file)}`);
      secretsFound = true;
    }
  });
});

if (!secretsFound) {
  logSuccess('No hardcoded secrets found');
}

// 2. Check environment file security
console.log('\n🔐 Checking environment file security...\n');

const envFiles = ['.env', '.env.local', '.env.production'];
let unsafeEnvFiles = false;

envFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    logIssue('warning', 'ENV FILES', `${file} exists. Ensure it's not committed to git.`);
    unsafeEnvFiles = true;
  }
});

// Check .gitignore
const gitignorePath = path.join(__dirname, '../../.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignore.includes('.env')) {
    logIssue('error', 'GITIGNORE', '.env files not in .gitignore');
  } else {
    logSuccess('.env files are ignored by git');
  }
} else {
  logIssue('warning', 'GITIGNORE', '.gitignore file not found');
}

// 3. Check dependencies for vulnerabilities
console.log('\n📦 Checking for vulnerable dependencies...\n');

try {
  execSync('npm audit --json', { stdio: 'pipe' });
  logSuccess('No vulnerabilities found in dependencies');
} catch (error) {
  try {
    const auditResult = JSON.parse(error.stdout.toString());
    const { vulnerabilities } = auditResult.metadata;
    
    if (vulnerabilities.high > 0 || vulnerabilities.critical > 0) {
      logIssue('error', 'DEPENDENCIES', 
        `Found ${vulnerabilities.critical} critical and ${vulnerabilities.high} high severity vulnerabilities`);
    } else if (vulnerabilities.moderate > 0) {
      logIssue('warning', 'DEPENDENCIES', 
        `Found ${vulnerabilities.moderate} moderate severity vulnerabilities`);
    }
    
    console.log('   Run "npm audit fix" to attempt automatic fixes');
  } catch (parseError) {
    logIssue('warning', 'DEPENDENCIES', 'Could not parse npm audit results');
  }
}

// 4. Check authentication implementation
console.log('\n🔑 Checking authentication implementation...\n');

const authMiddlewarePath = path.join(__dirname, '../src/middleware/auth.js');
if (fs.existsSync(authMiddlewarePath)) {
  const authCode = fs.readFileSync(authMiddlewarePath, 'utf8');
  
  if (authCode.includes('jwt.verify') || authCode.includes('jsonwebtoken')) {
    logSuccess('JWT authentication implemented');
  } else {
    logIssue('error', 'AUTH', 'JWT verification not found in auth middleware');
  }
  
  if (authCode.includes('Bearer')) {
    logSuccess('Bearer token authentication used');
  }
} else {
  logIssue('error', 'AUTH', 'Auth middleware not found');
}

// 5. Check CORS configuration
console.log('\n🌐 Checking CORS configuration...\n');

const serverPath = path.join(__dirname, '../src/server.js');
if (fs.existsSync(serverPath)) {
  const serverCode = fs.readFileSync(serverPath, 'utf8');
  
  if (serverCode.includes('cors(')) {
    logSuccess('CORS middleware configured');
    
    if (serverCode.includes('origin:') && !serverCode.includes("origin: '*'")) {
      logSuccess('CORS origin is restricted (not wildcard)');
    } else if (serverCode.includes("origin: '*'")) {
      logIssue('error', 'CORS', 'CORS allows all origins (wildcard). Restrict in production!');
    }
  } else {
    logIssue('warning', 'CORS', 'CORS middleware not found');
  }
}

// 6. Check security headers (Helmet)
console.log('\n🛡️  Checking security headers...\n');

if (fs.existsSync(serverPath)) {
  const serverCode = fs.readFileSync(serverPath, 'utf8');
  
  if (serverCode.includes('helmet')) {
    logSuccess('Helmet security headers configured');
    
    if (serverCode.includes('contentSecurityPolicy')) {
      logSuccess('Content Security Policy (CSP) configured');
    } else {
      logIssue('warning', 'HEADERS', 'Consider adding Content Security Policy');
    }
    
    if (serverCode.includes('hsts')) {
      logSuccess('HSTS configured');
    }
  } else {
    logIssue('error', 'HEADERS', 'Helmet middleware not found');
  }
}

// 7. Check rate limiting
console.log('\n⏱️  Checking rate limiting...\n');

if (fs.existsSync(serverPath)) {
  const serverCode = fs.readFileSync(serverPath, 'utf8');
  
  if (serverCode.includes('rateLimit') || serverCode.includes('express-rate-limit')) {
    logSuccess('Rate limiting configured');
  } else {
    logIssue('error', 'RATE LIMIT', 'Rate limiting not found');
  }
}

// 8. Check SQL injection protection
console.log('\n💉 Checking SQL injection protection...\n');

const controllerFiles = fs.readdirSync(path.join(__dirname, '../src/controllers'));
let unsafeQueries = false;

controllerFiles.forEach(file => {
  const filePath = path.join(__dirname, '../src/controllers', file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for string concatenation in queries (unsafe)
  if (content.match(/query\s*\(\s*['"`].*\$\{/)) {
    logIssue('error', 'SQL INJECTION', 
      `Possible SQL injection in ${file}. Use parameterized queries!`);
    unsafeQueries = true;
  }
});

if (!unsafeQueries) {
  logSuccess('No obvious SQL injection vulnerabilities found');
}

// 9. Check password hashing
console.log('\n🔒 Checking password hashing...\n');

const authControllerPath = path.join(__dirname, '../src/controllers/authController.js');
if (fs.existsSync(authControllerPath)) {
  const authController = fs.readFileSync(authControllerPath, 'utf8');
  
  if (authController.includes('bcrypt') || authController.includes('bcryptjs')) {
    logSuccess('Password hashing with bcrypt implemented');
    
    // Check for proper salt rounds
    const saltRoundsMatch = authController.match(/bcrypt\.hash.*?(\d+)/);
    if (saltRoundsMatch) {
      const rounds = parseInt(saltRoundsMatch[1]);
      if (rounds >= 12) {
        logSuccess(`bcrypt salt rounds: ${rounds} (good)`);
      } else {
        logIssue('warning', 'PASSWORD', `bcrypt salt rounds: ${rounds} (consider 12+)`);
      }
    }
  } else {
    logIssue('error', 'PASSWORD', 'bcrypt not found in auth controller');
  }
}

// 10. Check for console.log statements (information disclosure)
console.log('\n📢 Checking for console.log statements...\n');

let consoleLogsFound = 0;
filesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/console\.(log|debug|info)\(/g);
  if (matches) {
    consoleLogsFound += matches.length;
  }
});

if (consoleLogsFound > 0) {
  logIssue('warning', 'LOGGING', 
    `Found ${consoleLogsFound} console.log statements. Remove or replace with logger in production.`);
} else {
  logSuccess('No console.log statements found');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Security Audit Summary\n');

console.log(`✅ Checks passed: ${10 - errors.length - warnings.length}`);
if (warnings.length > 0) {
  console.log(`⚠️  Warnings: ${warnings.length}`);
}
if (errors.length > 0) {
  console.log(`❌ Errors: ${errors.length}`);
}

console.log('\n' + '='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ Security audit FAILED');
  console.log('   Critical issues found. Fix errors before deploying!\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  Security audit PASSED with warnings');
  console.log('   Review warnings above before deploying.\n');
  process.exit(0);
} else {
  console.log('\n✅ Security audit PASSED');
  console.log('   No security issues found!\n');
  process.exit(0);
}
