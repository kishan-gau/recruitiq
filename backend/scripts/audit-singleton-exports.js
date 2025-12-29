#!/usr/bin/env node

/**
 * Script to identify singleton service exports that should use class exports
 * 
 * Standards Violation: BACKEND_STANDARDS.md - "Export class, not singleton instance"
 * Issue: Prevents dependency injection, makes testing difficult
 * 
 * Usage: node scripts/audit-singleton-exports.js
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
 * Recursively find all JavaScript service/controller files
 */
function findServiceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, test directories
      if (!['node_modules', 'tests', '__tests__'].includes(file)) {
        findServiceFiles(filePath, fileList);
      }
    } else if (
      (file.endsWith('Service.js') || file.endsWith('Controller.js')) && 
      !file.endsWith('.test.js')
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check if file exports singleton
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Check last 10 lines for export statement
  const lastLines = lines.slice(-10);
  
  for (let i = 0; i < lastLines.length; i++) {
    const line = lastLines[i];
    
    // Check for singleton export pattern: export default new ClassName()
    if (line.match(/export\s+default\s+new\s+\w+\s*\(/)) {
      return {
        filePath,
        line: lines.length - lastLines.length + i + 1,
        code: line.trim(),
      };
    }
  }
  
  return null;
}

/**
 * Suggest fix for a file
 */
function suggestFix(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find class definition
  const classMatch = content.match(/class\s+(\w+)/);
  if (!classMatch) {
    return null;
  }
  
  const className = classMatch[1];
  
  // Check if constructor has parameters
  const constructorMatch = content.match(/constructor\s*\((.*?)\)/);
  const hasConstructorParams = constructorMatch && constructorMatch[1].trim().length > 0;
  
  return {
    className,
    hasConstructorParams,
    suggestion: hasConstructorParams 
      ? `Export class for DI: export default ${className};`
      : `Add DI constructor and export class: export default ${className};`,
  };
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}=== Singleton Export Audit ===${colors.reset}\n`);
  console.log(`${colors.yellow}Standard Violation:${colors.reset} BACKEND_STANDARDS.md requires class exports with DI`);
  console.log(`${colors.red}Issue:${colors.reset} Singleton exports prevent dependency injection and proper testing\n`);

  const files = findServiceFiles(BACKEND_DIR);
  const results = [];

  files.forEach((file) => {
    const result = checkFile(file);
    if (result) {
      const fix = suggestFix(file);
      results.push({ ...result, fix });
    }
  });

  if (results.length === 0) {
    console.log(`${colors.green}✓ No singleton export violations found!${colors.reset}\n`);
    return;
  }

  console.log(`${colors.red}✗ Found ${results.length} files with singleton exports:${colors.reset}\n`);

  results.forEach(({ filePath, line, code, fix }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`${colors.bold}${relativePath}${colors.reset}`);
    console.log(`  ${colors.yellow}Line ${line}:${colors.reset} ${code}`);
    
    if (fix) {
      console.log(`  ${colors.cyan}Class:${colors.reset} ${fix.className}`);
      console.log(`  ${colors.green}Fix:${colors.reset} ${fix.suggestion}`);
    }
    
    console.log('');
  });

  console.log(`${colors.cyan}Total violations: ${results.length} files${colors.reset}`);
  
  console.log(`\n${colors.bold}How to fix:${colors.reset}`);
  console.log(`  1. Add constructor with dependency injection support`);
  console.log(`  2. Change export to class, not instance`);
  console.log(`  3. Update imports to instantiate the class`);
  
  console.log(`\n${colors.yellow}Example Fix:${colors.reset}`);
  console.log(`  ${colors.red}❌ WRONG:${colors.reset}`);
  console.log(`    class ProductService {`);
  console.log(`      // No DI support`);
  console.log(`    }`);
  console.log(`    export default new ProductService(); // Singleton!`);
  console.log(``);
  console.log(`  ${colors.green}✅ CORRECT:${colors.reset}`);
  console.log(`    class ProductService {`);
  console.log(`      constructor(repository = null) {`);
  console.log(`        this.repository = repository || new ProductRepository();`);
  console.log(`      }`);
  console.log(`    }`);
  console.log(`    export default ProductService; // Export class for DI`);
  console.log(``);
  console.log(`  ${colors.cyan}Usage in tests:${colors.reset}`);
  console.log(`    const mockRepo = { findById: jest.fn() };`);
  console.log(`    const service = new ProductService(mockRepo); // Inject mock`);

  process.exit(1);
}

main();
