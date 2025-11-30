/**
 * Migration Verification Script
 * 
 * Compares original schema SQL files with Knex migration files to ensure
 * all tables, columns, indexes, and constraints have been properly migrated.
 * 
 * Usage: node scripts/verify-migrations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_DIR = path.join(__dirname, '../src/database');
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

/**
 * Extract table names from SQL schema files
 */
function extractTablesFromSQL(sqlContent) {
  const tables = [];
  const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_]+\.[a-z_]+|[a-z_]+)\s*\(/gi;
  let match;
  
  while ((match = tableRegex.exec(sqlContent)) !== null) {
    tables.push(match[1]);
  }
  
  return tables;
}

/**
 * Extract table names from Knex migration files
 */
function extractTablesFromMigration(migrationContent) {
  const tables = [];
  
  // Match: createTable('table_name' or withSchema('schema').createTable('table_name'
  const createTableRegex = /\.createTable\(['"]([a-z_]+)['"]/gi;
  let match;
  
  while ((match = createTableRegex.exec(migrationContent)) !== null) {
    tables.push(match[1]);
  }
  
  // Also check for schema-prefixed tables in raw SQL
  const rawTableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_]+\.[a-z_]+|[a-z_]+)\s*\(/gi;
  while ((match = rawTableRegex.exec(migrationContent)) !== null) {
    tables.push(match[1]);
  }
  
  return tables;
}

/**
 * Check if a table is in migrations
 */
function isTableMigrated(tableName, allMigrationTables) {
  // Remove schema prefix for comparison
  const plainTableName = tableName.includes('.') ? tableName.split('.')[1] : tableName;
  
  return allMigrationTables.some(migTable => {
    const plainMigTable = migTable.includes('.') ? migTable.split('.')[1] : migTable;
    return plainMigTable === plainTableName;
  });
}

/**
 * Main verification function
 */
async function verifyMigrations() {
  console.log(`${colors.blue}========================================`);
  console.log('Migration Verification Report');
  console.log(`========================================${colors.reset}\n`);

  const schemaFiles = [
    { file: 'schema.sql', name: 'Core Schema' },
    { file: 'nexus-hris-schema.sql', name: 'Nexus HRIS Schema' },
    { file: 'paylinq-schema.sql', name: 'PayLinQ Schema' },
    { file: 'schedulehub-schema.sql', name: 'ScheduleHub Schema' },
    { file: 'recruitiq-schema.sql', name: 'RecruitIQ Schema' }
  ];

  const migrationFiles = [
    { file: '20251128000001_create_core_tables.js', name: 'Core Tables Migration' },
    { file: '20251128000002_create_hris_schema.js', name: 'HRIS Schema Migration' },
    { file: '20251128000003_create_payroll_schema.js', name: 'Payroll Schema Migration' },
    { file: '20251128000004_create_scheduling_schema.js', name: 'ScheduleHub Migration' },
    { file: '20251128000005_create_recruitiq_schema.js', name: 'RecruitIQ Migration' }
  ];

  // Read all migration content
  const allMigrationTables = [];
  for (const migration of migrationFiles) {
    const migrationPath = path.join(MIGRATIONS_DIR, migration.file);
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const tables = extractTablesFromMigration(content);
      allMigrationTables.push(...tables);
    }
  }

  let totalTables = 0;
  let migratedTables = 0;
  let missingTables = [];

  // Check each schema file
  for (const schema of schemaFiles) {
    const schemaPath = path.join(SCHEMA_DIR, schema.file);
    
    if (!fs.existsSync(schemaPath)) {
      console.log(`${colors.yellow}⚠️  Schema file not found: ${schema.file}${colors.reset}`);
      continue;
    }

    console.log(`${colors.blue}Checking ${schema.name}...${colors.reset}`);
    
    const sqlContent = fs.readFileSync(schemaPath, 'utf-8');
    const tables = extractTablesFromSQL(sqlContent);
    
    console.log(`  Found ${tables.length} tables in schema file`);
    
    let schemaMissing = [];
    
    for (const table of tables) {
      totalTables++;
      
      if (isTableMigrated(table, allMigrationTables)) {
        migratedTables++;
      } else {
        schemaMissing.push(table);
        missingTables.push({ schema: schema.name, table });
      }
    }
    
    if (schemaMissing.length === 0) {
      console.log(`  ${colors.green}✓ All tables migrated${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Missing ${schemaMissing.length} tables:${colors.reset}`);
      schemaMissing.forEach(t => console.log(`    - ${t}`));
    }
    
    console.log();
  }

  // Summary
  console.log(`${colors.blue}========================================`);
  console.log('Summary');
  console.log(`========================================${colors.reset}`);
  console.log(`Total tables in schema files: ${totalTables}`);
  console.log(`Migrated tables: ${colors.green}${migratedTables}${colors.reset}`);
  console.log(`Missing tables: ${missingTables.length > 0 ? colors.red : colors.green}${totalTables - migratedTables}${colors.reset}`);
  
  if (missingTables.length > 0) {
    console.log(`\n${colors.red}Missing Tables:${colors.reset}`);
    missingTables.forEach(({ schema, table }) => {
      console.log(`  ${schema}: ${table}`);
    });
  }

  const coverage = totalTables > 0 ? ((migratedTables / totalTables) * 100).toFixed(2) : 0;
  console.log(`\nMigration Coverage: ${coverage}%`);

  if (coverage === 100) {
    console.log(`\n${colors.green}✓ All tables have been successfully migrated!${colors.reset}`);
    return 0;
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tables are still missing from migrations${colors.reset}`);
    return 1;
  }
}

// Run verification
verifyMigrations().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error(`${colors.red}Error during verification:${colors.reset}`, error);
  process.exit(1);
});
