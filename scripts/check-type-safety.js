#!/usr/bin/env node
/**
 * Type Safety Migration Checker
 * 
 * Scans all hooks and identifies files that need migration to use proper types
 * instead of response.data access patterns.
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = path.join(path.dirname(__dirname), 'apps/paylinq/src/hooks');

// Patterns that indicate potential issues
const PATTERNS = {
  responseData: /response\.data/g,
  anyTypeCast: /as any\)/g,
  dataTypeCast: /\.data as/g,
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const issues = [];

  // Check for response.data pattern
  const responseDataMatches = content.match(PATTERNS.responseData);
  if (responseDataMatches) {
    issues.push(`❌ Found ${responseDataMatches.length} uses of 'response.data'`);
  }

  // Check for 'as any' type casts
  const anyMatches = content.match(PATTERNS.anyTypeCast);
  if (anyMatches) {
    issues.push(`⚠️  Found ${anyMatches.length} uses of 'as any'`);
  }

  // Check for data type casts
  const dataMatches = content.match(PATTERNS.dataTypeCast);
  if (dataMatches) {
    issues.push(`⚠️  Found ${dataMatches.length} uses of '.data as'`);
  }

  return { fileName, issues, needsMigration: issues.length > 0 };
}

function main() {
  console.log('🔍 Scanning hooks for type safety issues...\n');
  
  const files = fs.readdirSync(HOOKS_DIR)
    .filter(f => f.startsWith('use') && f.endsWith('.ts'))
    .map(f => path.join(HOOKS_DIR, f));

  const results = files.map(scanFile);
  
  const needsMigration = results.filter(r => r.needsMigration);
  const alreadyMigrated = results.filter(r => !r.needsMigration);

  console.log('📊 Summary\n');
  console.log(`Total hooks: ${results.length}`);
  console.log(`✅ Already migrated: ${alreadyMigrated.length}`);
  console.log(`🔄 Need migration: ${needsMigration.length}\n`);

  if (needsMigration.length > 0) {
    console.log('🔧 Files needing migration:\n');
    needsMigration.forEach(({ fileName, issues }) => {
      console.log(`📄 ${fileName}`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    });

    console.log('\n📖 Migration guide: TYPE_SAFETY_MIGRATION_GUIDE.md');
    console.log('✨ Reference: apps/paylinq/src/hooks/usePayComponents.ts\n');
  }

  if (alreadyMigrated.length > 0) {
    console.log('\n✅ Already type-safe:');
    alreadyMigrated.forEach(({ fileName }) => {
      console.log(`   ${fileName}`);
    });
  }
}

main();
