#!/usr/bin/env node
/**
 * TypeScript Migration Helper
 * 
 * This script helps track and improve TypeScript migration progress
 * 
 * Usage:
 *   node scripts/ts-migration-status.js              # Show current status
 *   node scripts/ts-migration-status.js --verbose    # Show detailed errors
 *   node scripts/ts-migration-status.js --by-file    # Group errors by file
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

function runBuild() {
  try {
    execSync('npm run build 2>&1', { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, output: '' };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

function parseErrors(output) {
  const lines = output.split('\n');
  const errors = [];
  
  for (const line of lines) {
    const match = line.match(/^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5]
      });
    }
  }
  
  return errors;
}

function groupByErrorCode(errors) {
  const grouped = {};
  for (const error of errors) {
    if (!grouped[error.code]) {
      grouped[error.code] = [];
    }
    grouped[error.code].push(error);
  }
  return grouped;
}

function groupByFile(errors) {
  const grouped = {};
  for (const error of errors) {
    if (!grouped[error.file]) {
      grouped[error.file] = [];
    }
    grouped[error.file].push(error);
  }
  return grouped;
}

function getErrorCodeDescription(code) {
  const descriptions = {
    'TS2339': 'Property does not exist on type',
    'TS2551': 'Property does not exist on type (did you mean...?)',
    'TS2742': 'Inferred type cannot be named (needs explicit type)',
    'TS2554': 'Expected X arguments, but got Y',
    'TS2345': 'Argument type not assignable to parameter type',
    'TS7006': 'Parameter implicitly has an "any" type',
    'TS2307': 'Cannot find module or type declarations'
  };
  return descriptions[code] || 'Unknown error';
}

function showStatus() {
  console.log(`\n${BRIGHT}${BLUE}TypeScript Migration Status${RESET}\n`);
  console.log('Running TypeScript compiler...\n');
  
  const result = runBuild();
  const errors = parseErrors(result.output);
  
  if (errors.length === 0) {
    console.log(`${GREEN}✓ Build successful! No TypeScript errors.${RESET}\n`);
    return;
  }
  
  console.log(`${YELLOW}Build completed with ${errors.length} type errors${RESET}\n`);
  
  // Group by error code
  const byCode = groupByErrorCode(errors);
  const codes = Object.keys(byCode).sort((a, b) => byCode[b].length - byCode[a].length);
  
  console.log(`${BRIGHT}Error Distribution:${RESET}`);
  console.log('─'.repeat(80));
  
  for (const code of codes.slice(0, 10)) {
    const count = byCode[code].length;
    const percentage = ((count / errors.length) * 100).toFixed(1);
    const description = getErrorCodeDescription(code);
    console.log(`${code}: ${count.toString().padEnd(6)} (${percentage}%)  ${description}`);
  }
  
  // Files with most errors
  console.log(`\n${BRIGHT}Files with Most Errors (Top 10):${RESET}`);
  console.log('─'.repeat(80));
  
  const byFile = groupByFile(errors);
  const files = Object.keys(byFile).sort((a, b) => byFile[b].length - byFile[a].length);
  
  for (const file of files.slice(0, 10)) {
    const count = byFile[file].length;
    const shortFile = file.replace('src/', '');
    console.log(`${count.toString().padEnd(4)} errors  ${shortFile}`);
  }
  
  // Progress metrics
  console.log(`\n${BRIGHT}Migration Progress:${RESET}`);
  console.log('─'.repeat(80));
  
  const totalFiles = parseInt(execSync('find src -name "*.ts" | wc -l', { encoding: 'utf-8' }).trim());
  const filesWithErrors = files.length;
  const cleanFiles = totalFiles - filesWithErrors;
  const cleanPercentage = ((cleanFiles / totalFiles) * 100).toFixed(1);
  
  console.log(`Total TypeScript files: ${totalFiles}`);
  console.log(`Files with no errors:   ${cleanFiles} (${GREEN}${cleanPercentage}%${RESET})`);
  console.log(`Files with errors:      ${filesWithErrors} (${YELLOW}${(100 - cleanPercentage).toFixed(1)}%${RESET})`);
  
  // Recommendations
  console.log(`\n${BRIGHT}Recommendations:${RESET}`);
  console.log('─'.repeat(80));
  
  if (byCode['TS2339'] && byCode['TS2339'].length > 1000) {
    console.log(`${YELLOW}•${RESET} TS2339 (Property errors): Add property declarations to classes`);
    console.log(`  Example: Add "propertyName: type;" before constructor`);
  }
  
  if (byCode['TS7006'] && byCode['TS7006'].length > 100) {
    console.log(`${YELLOW}•${RESET} TS7006 (Implicit any): Add parameter types to functions`);
    console.log(`  Example: function foo(param: any) { ... }`);
  }
  
  if (byCode['TS2742'] && byCode['TS2742'].length > 10) {
    console.log(`${YELLOW}•${RESET} TS2742 (Inferred type): Add explicit type annotations`);
    console.log(`  Example: const router: Router = express.Router()`);
  }
  
  console.log(`\n${BLUE}For detailed help:${RESET}`);
  console.log(`  node scripts/ts-migration-status.js --verbose`);
  console.log(`  node scripts/ts-migration-status.js --by-file`);
  console.log();
}

function showVerbose() {
  console.log(`\n${BRIGHT}${BLUE}TypeScript Errors (Verbose)${RESET}\n`);
  
  const result = runBuild();
  const errors = parseErrors(result.output);
  
  if (errors.length === 0) {
    console.log(`${GREEN}✓ No errors!${RESET}\n`);
    return;
  }
  
  const byFile = groupByFile(errors);
  const files = Object.keys(byFile).sort();
  
  for (const file of files.slice(0, 20)) {  // Show first 20 files
    console.log(`\n${BRIGHT}${file}${RESET} (${byFile[file].length} errors)`);
    console.log('─'.repeat(80));
    
    for (const error of byFile[file].slice(0, 5)) {  // Show first 5 errors per file
      console.log(`  Line ${error.line}: ${RED}${error.code}${RESET} - ${error.message}`);
    }
    
    if (byFile[file].length > 5) {
      console.log(`  ... and ${byFile[file].length - 5} more errors`);
    }
  }
  
  if (files.length > 20) {
    console.log(`\n... and ${files.length - 20} more files with errors`);
  }
  
  console.log();
}

function showByFile() {
  console.log(`\n${BRIGHT}${BLUE}TypeScript Errors by File${RESET}\n`);
  
  const result = runBuild();
  const errors = parseErrors(result.output);
  
  if (errors.length === 0) {
    console.log(`${GREEN}✓ No errors!${RESET}\n`);
    return;
  }
  
  const byFile = groupByFile(errors);
  const files = Object.keys(byFile).sort((a, b) => byFile[b].length - byFile[a].length);
  
  for (const file of files) {
    const count = byFile[file].length;
    const shortFile = file.replace('src/', '');
    const bar = '█'.repeat(Math.min(50, Math.floor(count / 2)));
    console.log(`${count.toString().padStart(4)} ${bar} ${shortFile}`);
  }
  
  console.log();
}

// Main
const args = process.argv.slice(2);

if (args.includes('--verbose')) {
  showVerbose();
} else if (args.includes('--by-file')) {
  showByFile();
} else {
  showStatus();
}
