#!/usr/bin/env node

/**
 * Script to identify and report pool.query() usage that should use custom query() wrapper
 * 
 * Standards Violation: BACKEND_STANDARDS.md - "NEVER use pool.query() directly"
 * Security Risk: Bypasses tenant isolation and security logging
 * 
 * Usage: node scripts/audit-pool-query.js
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
 * Check if file uses pool.query()
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    // Check for pool.query usage
    if (line.includes('pool.query') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      // Check if it's importing the query wrapper
      if (line.includes('import') && line.includes('query')) {
        return; // Skip import statements
      }

      violations.push({
        line: index + 1,
        code: line.trim(),
        type: 'pool.query',
      });
    }

    // Check for client.query (transaction without wrapper)
    if (line.includes('client.query') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      if (line.includes('BEGIN') || line.includes('COMMIT') || line.includes('ROLLBACK')) {
        return; // Skip transaction control statements
      }

      violations.push({
        line: index + 1,
        code: line.trim(),
        type: 'client.query',
      });
    }
  });

  return violations.length > 0 ? { filePath, violations } : null;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}=== Pool Query Usage Audit ===${colors.reset}\n`);
  console.log(`${colors.yellow}Standard Violation:${colors.reset} BACKEND_STANDARDS.md requires using custom query() wrapper`);
  console.log(`${colors.red}Security Risk:${colors.reset} Direct pool.query() bypasses tenant isolation and security logging\n`);

  const files = findJavaScriptFiles(BACKEND_DIR);
  const results = [];

  files.forEach((file) => {
    const result = checkFile(file);
    if (result) {
      results.push(result);
    }
  });

  if (results.length === 0) {
    console.log(`${colors.green}✓ No pool.query() violations found!${colors.reset}\n`);
    return;
  }

  console.log(`${colors.red}✗ Found ${results.length} files with pool.query() violations:${colors.reset}\n`);

  results.forEach(({ filePath, violations }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`${colors.bold}${relativePath}${colors.reset}`);
    
    violations.forEach(({ line, code, type }) => {
      console.log(`  ${colors.yellow}Line ${line}:${colors.reset} ${code}`);
      console.log(`  ${colors.red}  Issue: Using ${type} instead of custom query() wrapper${colors.reset}`);
    });
    
    console.log('');
  });

  console.log(`${colors.cyan}Total violations: ${results.length} files${colors.reset}`);
  console.log(`\n${colors.bold}How to fix:${colors.reset}`);
  console.log(`  1. Import custom query wrapper: ${colors.green}import { query } from '../../../config/database.js';${colors.reset}`);
  console.log(`  2. Replace pool.query() with query()`);
  console.log(`  3. Add organizationId parameter for tenant isolation`);
  console.log(`  4. Add metadata object: ${colors.green}{ operation: 'SELECT', table: 'table_name' }${colors.reset}`);
  console.log(`\n${colors.yellow}Example:${colors.reset}`);
  console.log(`  ${colors.red}❌ const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);${colors.reset}`);
  console.log(`  ${colors.green}✅ const result = await query(${colors.reset}`);
  console.log(`      'SELECT * FROM jobs WHERE id = $1 AND organization_id = $2',`);
  console.log(`      [id, organizationId],`);
  console.log(`      organizationId,`);
  console.log(`      { operation: 'SELECT', table: 'jobs' }`);
  console.log(`    );`);

  process.exit(1);
}

main();
