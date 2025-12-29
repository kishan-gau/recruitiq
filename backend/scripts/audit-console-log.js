#!/usr/bin/env node

/**
 * Script to identify console.log() usage that should use proper logger
 * 
 * Standards Violation: BACKEND_STANDARDS.md - "Use logger instead of console.log"
 * Issue: Missing structured logging, no log aggregation
 * 
 * Usage: node scripts/audit-console-log.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.join(__dirname, '..', 'src');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Recursively find all JavaScript files
 */
function findJavaScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, test directories
      if (!['node_modules', 'tests', '__tests__'].includes(file)) {
        findJavaScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check if file uses console.log, console.error, console.warn
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    // Check for console usage (including bracket notation)
    const consoleMatch = line.match(/console\.(log|error|warn|info|debug)/) || 
                        line.match(/console\[['"`](log|error|warn|info|debug)['"`]\]/);
    if (consoleMatch) {
      violations.push({
        line: index + 1,
        code: line.trim(),
        method: consoleMatch[1],
      });
    }
  });

  return violations.length > 0 ? { filePath, violations } : null;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}=== Console.log Usage Audit ===${colors.reset}\n`);
  console.log(`${colors.yellow}Standard Violation:${colors.reset} BACKEND_STANDARDS.md requires using structured logger`);
  console.log(`${colors.red}Issue:${colors.reset} Missing context, no log aggregation, not production-ready\n`);

  const files = findJavaScriptFiles(BACKEND_DIR);
  const results = [];

  files.forEach((file) => {
    const result = checkFile(file);
    if (result) {
      results.push(result);
    }
  });

  if (results.length === 0) {
    console.log(`${colors.green}✓ No console.log() violations found!${colors.reset}\n`);
    return;
  }

  console.log(`${colors.red}✗ Found ${results.length} files with console usage:${colors.reset}\n`);

  // Group by file
  results.forEach(({ filePath, violations }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`${colors.bold}${relativePath}${colors.reset} (${violations.length} violations)`);
    
    violations.forEach(({ line, code, method }) => {
      const severity = method === 'log' ? colors.yellow : 
                      method === 'error' ? colors.red : 
                      colors.cyan;
      console.log(`  ${severity}Line ${line}:${colors.reset} ${code}`);
    });
    
    console.log('');
  });

  console.log(`${colors.cyan}Total violations: ${results.length} files${colors.reset}`);
  
  // Count by method
  const methodCounts = {};
  results.forEach(({ violations }) => {
    violations.forEach(({ method }) => {
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
  });
  
  console.log(`\n${colors.bold}Breakdown:${colors.reset}`);
  Object.entries(methodCounts).forEach(([method, count]) => {
    console.log(`  console.${method}: ${count} occurrences`);
  });

  console.log(`\n${colors.bold}How to fix:${colors.reset}`);
  console.log(`  1. Import logger: ${colors.green}import logger from '../utils/logger.js';${colors.reset}`);
  console.log(`  2. Replace console methods with logger methods`);
  console.log(`  3. Add structured context as second parameter`);
  
  console.log(`\n${colors.yellow}Mapping:${colors.reset}`);
  console.log(`  ${colors.red}❌ console.log()${colors.reset}    → ${colors.green}✅ logger.info()${colors.reset}`);
  console.log(`  ${colors.red}❌ console.error()${colors.reset}  → ${colors.green}✅ logger.error()${colors.reset}`);
  console.log(`  ${colors.red}❌ console.warn()${colors.reset}   → ${colors.green}✅ logger.warn()${colors.reset}`);
  console.log(`  ${colors.red}❌ console.debug()${colors.reset}  → ${colors.green}✅ logger.debug()${colors.reset}`);
  
  console.log(`\n${colors.yellow}Example:${colors.reset}`);
  console.log(`  ${colors.red}❌ console.log('User created:', user);${colors.reset}`);
  console.log(`  ${colors.green}✅ logger.info('User created', {${colors.reset}`);
  console.log(`      userId: user.id,`);
  console.log(`      organizationId: user.organizationId,`);
  console.log(`      timestamp: new Date().toISOString()`);
  console.log(`    });`);

  process.exit(1);
}

main();
