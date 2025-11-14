#!/usr/bin/env node
/**
 * Path Alias Migration Script
 * 
 * Automatically converts relative imports to path aliases
 * Usage: node scripts/migrate-to-aliases.js [--folders=folder1,folder2] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const foldersArg = args.find(arg => arg.startsWith('--folders='));
const targetFolders = foldersArg 
  ? foldersArg.split('=')[1].split(',').map(f => f.trim())
  : null;

// Path alias mapping
const aliasMap = {
  '@config': 'src/config',
  '@controllers': 'src/controllers',
  '@middleware': 'src/middleware',
  '@services': 'src/services',
  '@models': 'src/models',
  '@repositories': 'src/repositories',
  '@routes': 'src/routes',
  '@utils': 'src/utils',
  '@shared': 'src/shared',
  '@products': 'src/products',
  '@modules': 'src/modules',
  '@dto': 'src/dto',
  '@database': 'src/database',
  '@integrations': 'src/integrations',
  '@api': 'src/api',
};

/**
 * Calculate relative path depth and convert to alias
 */
function getAliasForPath(currentFile, importPath) {
  // Skip if already an alias
  if (importPath.startsWith('@')) {
    return null;
  }

  // Skip if not a relative import
  if (!importPath.startsWith('.')) {
    return null;
  }

  // Resolve the absolute path
  const currentDir = path.dirname(currentFile);
  const absoluteImportPath = path.resolve(currentDir, importPath);
  const relativeToSrc = path.relative(path.join(rootDir, 'src'), absoluteImportPath);

  // Find matching alias
  for (const [alias, aliasPath] of Object.entries(aliasMap)) {
    const targetPath = aliasPath.replace('src/', '');
    
    if (relativeToSrc.startsWith(targetPath)) {
      const remainingPath = relativeToSrc.substring(targetPath.length);
      const newImport = alias + remainingPath.replace(/\\/g, '/');
      return newImport;
    }
  }

  return null;
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let changes = [];

  // Match import and require statements
  const importRegex = /(?:import|export).*?from\s+['"](.+?)['"]/g;
  const requireRegex = /require\(['"](.+?)['"]\)/g;

  let match;

  // Process imports
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const newAlias = getAliasForPath(filePath, importPath);

    if (newAlias) {
      const oldStatement = match[0];
      const newStatement = oldStatement.replace(importPath, newAlias);
      newContent = newContent.replace(oldStatement, newStatement);
      
      changes.push({
        line: content.substring(0, match.index).split('\n').length,
        old: importPath,
        new: newAlias,
      });
    }
  }

  // Process requires
  while ((match = requireRegex.exec(content)) !== null) {
    const importPath = match[1];
    const newAlias = getAliasForPath(filePath, importPath);

    if (newAlias) {
      const oldStatement = match[0];
      const newStatement = oldStatement.replace(importPath, newAlias);
      newContent = newContent.replace(oldStatement, newStatement);
      
      changes.push({
        line: content.substring(0, match.index).split('\n').length,
        old: importPath,
        new: newAlias,
      });
    }
  }

  // Write changes if not dry run
  if (changes.length > 0) {
    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, 'utf8');
    }

    return {
      file: path.relative(rootDir, filePath),
      changes,
    };
  }

  return null;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Path Alias Migration Tool\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}\n`);

  // Build glob pattern
  let pattern = 'src/**/*.js';
  if (targetFolders) {
    pattern = `src/{${targetFolders.join(',')}}/**/*.js`;
    console.log(`Target folders: ${targetFolders.join(', ')}\n`);
  }

  // Find all JavaScript files
  const files = glob.sync(pattern, { cwd: rootDir, absolute: true });
  console.log(`Found ${files.length} files to process\n`);

  const results = [];
  let totalChanges = 0;

  // Process each file
  for (const file of files) {
    const result = migrateFile(file);
    if (result) {
      results.push(result);
      totalChanges += result.changes.length;
    }
  }

  // Print results
  console.log('📊 Migration Results\n');
  console.log(`Files modified: ${results.length}`);
  console.log(`Total changes: ${totalChanges}\n`);

  if (results.length > 0) {
    console.log('📝 Detailed Changes:\n');
    
    for (const result of results) {
      console.log(`\n✓ ${result.file}`);
      for (const change of result.changes) {
        console.log(`  Line ${change.line}: ${change.old} → ${change.new}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No files were modified');
    console.log('Run without --dry-run to apply changes\n');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Run tests: npm test');
    console.log('3. Run integration tests: npm run test:integration');
    console.log('4. Start server: npm run dev');
    console.log('5. If all tests pass: git commit -m "refactor: migrate to path aliases"\n');
  }

  // Generate statistics
  const stats = {
    totalFiles: files.length,
    modifiedFiles: results.length,
    totalChanges,
    byAlias: {},
  };

  results.forEach(result => {
    result.changes.forEach(change => {
      const alias = change.new.split('/')[0];
      stats.byAlias[alias] = (stats.byAlias[alias] || 0) + 1;
    });
  });

  console.log('\n📈 Statistics by Alias:\n');
  Object.entries(stats.byAlias)
    .sort((a, b) => b[1] - a[1])
    .forEach(([alias, count]) => {
      console.log(`  ${alias}: ${count} changes`);
    });

  console.log('\n');

  return stats;
}

// Run migration
migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
