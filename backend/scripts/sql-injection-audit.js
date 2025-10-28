/**
 * SQL Injection Security Audit Script
 * Scans all database queries for potential SQL injection vulnerabilities
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Patterns that indicate potential SQL injection vulnerabilities
const VULNERABLE_PATTERNS = [
  // Template literals with variables in SQL queries
  {
    pattern: /(?:pool|client|db)\.query\([`'"].*\$\{[^}]+\}.*[`'"]/g,
    severity: 'CRITICAL',
    description: 'String interpolation in SQL query',
    example: 'pool.query(`SELECT * FROM users WHERE id = ${id}`)'
  },
  // String concatenation in SQL queries
  {
    pattern: /(?:pool|client|db)\.query\([`'"][^`'"]*\s*\+\s*[^`'"]/g,
    severity: 'CRITICAL',
    description: 'String concatenation in SQL query',
    example: 'pool.query("SELECT * FROM users WHERE id = " + id)'
  },
  // Dynamic query building without parameterization
  {
    pattern: /(?:let|const|var)\s+query\s*=\s*[`'"][^`'"]*\$\{/g,
    severity: 'HIGH',
    description: 'Dynamic query with string interpolation',
    example: 'const query = `SELECT * FROM ${table}`'
  }
];

// Safe patterns (for comparison)
const SAFE_PATTERNS = [
  {
    pattern: /(?:pool|client|db)\.query\([`'"][^`'"$]*[`'"],\s*\[/g,
    description: 'Parameterized query with array'
  },
  {
    pattern: /(?:pool|client|db)\.query\([`'"][^`'"$]*\$\d+[^`'"]*[`'"],\s*\[/g,
    description: 'Parameterized query with $1, $2, etc.'
  }
];

const results = {
  filesScanned: 0,
  queriesFound: 0,
  vulnerabilities: [],
  safeQueries: [],
  warnings: []
};

/**
 * Recursively get all JavaScript files
 */
async function getJSFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, test directories
      if (!['node_modules', 'test-results', '.git'].includes(entry.name)) {
        await getJSFiles(fullPath, files);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Scan a file for SQL injection vulnerabilities
 */
async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  results.filesScanned++;
  
  // Check for vulnerable patterns
  for (const { pattern, severity, description, example } of VULNERABLE_PATTERNS) {
    const matches = [...content.matchAll(pattern)];
    
    for (const match of matches) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const line = lines[lineNumber - 1].trim();
      
      // Skip if line or surrounding context has sql-injection-safe comment
      const contextStart = Math.max(0, lineNumber - 3);
      const contextEnd = Math.min(lines.length, lineNumber + 2);
      const contextLines = lines.slice(contextStart, contextEnd).join('\n');
      
      if (contextLines.toLowerCase().includes('sql-injection-safe')) {
        continue; // Skip this match, it's been verified as safe
      }
      
      results.vulnerabilities.push({
        file: relativePath,
        line: lineNumber,
        severity,
        description,
        code: line,
        example
      });
    }
  }
  
  // Count queries (for statistics)
  const queryMatches = content.match(/(?:pool|client|db)\.query\(/g);
  if (queryMatches) {
    results.queriesFound += queryMatches.length;
    
    // Check if they're safe
    for (const { pattern, description } of SAFE_PATTERNS) {
      const safeMatches = [...content.matchAll(pattern)];
      results.safeQueries.push(...safeMatches.map(() => ({
        file: relativePath,
        type: description
      })));
    }
  }
}

/**
 * Print report
 */
function printReport() {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.blue}SQL INJECTION SECURITY AUDIT${colors.reset}`);
  console.log('='.repeat(80) + '\n');
  
  console.log(`${colors.blue}📊 Statistics:${colors.reset}`);
  console.log(`   Files scanned: ${results.filesScanned}`);
  console.log(`   Database queries found: ${results.queriesFound}`);
  console.log(`   Safe queries: ${results.safeQueries.length}`);
  console.log(`   Potential vulnerabilities: ${results.vulnerabilities.length}\n`);
  
  if (results.vulnerabilities.length > 0) {
    console.log(`${colors.red}⚠️  VULNERABILITIES FOUND:${colors.reset}\n`);
    
    // Group by severity
    const critical = results.vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const high = results.vulnerabilities.filter(v => v.severity === 'HIGH');
    const medium = results.vulnerabilities.filter(v => v.severity === 'MEDIUM');
    
    if (critical.length > 0) {
      console.log(`${colors.red}🔴 CRITICAL (${critical.length}):${colors.reset}`);
      critical.forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.file}:${v.line}`);
        console.log(`   ${v.description}`);
        console.log(`   ${colors.yellow}Code: ${v.code}${colors.reset}`);
        console.log(`   ${colors.blue}Safe pattern: ${v.example.replace(/'/g, '"').replace(/id/g, '$1, [id]')}${colors.reset}`);
      });
    }
    
    if (high.length > 0) {
      console.log(`\n${colors.yellow}🟡 HIGH (${high.length}):${colors.reset}`);
      high.forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.file}:${v.line}`);
        console.log(`   ${v.description}`);
        console.log(`   ${colors.yellow}Code: ${v.code}${colors.reset}`);
      });
    }
    
    if (medium.length > 0) {
      console.log(`\n${colors.yellow}🟠 MEDIUM (${medium.length}):${colors.reset}`);
      medium.forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.file}:${v.line}`);
        console.log(`   ${v.description}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.red}❌ AUDIT FAILED - ${results.vulnerabilities.length} vulnerabilities found${colors.reset}`);
    console.log('='.repeat(80) + '\n');
    
    console.log(`${colors.blue}📋 Remediation Guidelines:${colors.reset}\n`);
    console.log('1. Use parameterized queries with $1, $2, etc.');
    console.log('   ❌ BAD:  pool.query(`SELECT * FROM users WHERE id = ${id}`)');
    console.log('   ✅ GOOD: pool.query("SELECT * FROM users WHERE id = $1", [id])\n');
    
    console.log('2. Never concatenate user input into SQL queries');
    console.log('   ❌ BAD:  pool.query("SELECT * FROM users WHERE name = \'" + name + "\'")');
    console.log('   ✅ GOOD: pool.query("SELECT * FROM users WHERE name = $1", [name])\n');
    
    console.log('3. For dynamic table/column names, use allowlists');
    console.log('   ❌ BAD:  pool.query(`SELECT * FROM ${table}`)');
    console.log('   ✅ GOOD: const allowedTables = ["users", "jobs"];');
    console.log('            if (!allowedTables.includes(table)) throw Error();');
    console.log('            pool.query(`SELECT * FROM ${table}`)\n');
    
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ NO VULNERABILITIES FOUND${colors.reset}\n`);
    console.log(`All ${results.queriesFound} database queries appear to use safe parameterized statements.\n`);
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const srcDir = path.join(__dirname, '..', 'src');
    console.log(`${colors.blue}Scanning directory: ${srcDir}${colors.reset}\n`);
    
    const files = await getJSFiles(srcDir);
    console.log(`Found ${files.length} JavaScript files to scan...\n`);
    
    for (const file of files) {
      await scanFile(file);
    }
    
    printReport();
  } catch (error) {
    console.error(`${colors.red}Error during audit:${colors.reset}`, error);
    process.exit(1);
  }
}

main();
