# Phase 1: Preparation - Knex.js Setup

**Status:** Ready for Implementation  
**Duration:** Week 1 (5 working days)  
**Prerequisites:** Node.js 20+, PostgreSQL 15+, pnpm installed

---

## Overview

Phase 1 establishes the foundation for Knex.js migrations by installing dependencies, creating configuration files, and setting up the directory structure.

---

## Day 1: Installation & Configuration

### Step 1.1: Install Knex.js

```bash
# Navigate to backend directory
cd c:\RecruitIQ\backend

# Install Knex.js as production dependency (needed for runtime migrations)
pnpm add knex

# Install Knex CLI globally (optional, for convenience)
pnpm add -g knex
```

**Verification:**
```bash
# Check installation
pnpm list knex
# Should show: knex 3.1.0 (or latest)

# Check CLI (if installed globally)
knex --version
```

### Step 1.2: Create Knex Configuration File

Create `backend/knexfile.js`:

```javascript
/**
 * Knex.js Configuration
 * Database migration and seeding configuration for all environments
 * 
 * @see https://knexjs.org/guide/
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

/**
 * Base configuration shared across environments
 */
const baseConfig = {
  client: 'pg',
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    extension: 'js',
    loadExtensions: ['.js'],
    schemaName: 'public'
  },
  seeds: {
    directory: './seeds',
    loadExtensions: ['.js']
  }
};

/**
 * Environment-specific configurations
 */
const config = {
  /**
   * Development environment
   */
  development: {
    ...baseConfig,
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'recruitiq_dev'
    },
    pool: {
      min: 2,
      max: 10
    },
    debug: false // Set to true for SQL query logging
  },

  /**
   * Test environment
   */
  test: {
    ...baseConfig,
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'recruitiq_test'
    },
    pool: {
      min: 1,
      max: 5
    }
  },

  /**
   * Production environment
   */
  production: {
    ...baseConfig,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false // For managed PostgreSQL (e.g., AWS RDS)
      } : false
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000
    },
    acquireConnectionTimeout: 60000
  }
};

// Export configuration for current environment
export default config[process.env.NODE_ENV || 'development'];
```

**Verification:**
```bash
# Test configuration loading
node -e "import('./knexfile.js').then(c => console.log(c))"

# Should output configuration object
```

### Step 1.3: Update package.json Scripts

Add migration scripts to `backend/package.json`:

```json
{
  "scripts": {
    "migrate:make": "knex migrate:make --knexfile knexfile.js",
    "migrate:latest": "knex migrate:latest --knexfile knexfile.js",
    "migrate:up": "knex migrate:up --knexfile knexfile.js",
    "migrate:down": "knex migrate:down --knexfile knexfile.js",
    "migrate:rollback": "knex migrate:rollback --knexfile knexfile.js",
    "migrate:rollback:all": "knex migrate:rollback --all --knexfile knexfile.js",
    "migrate:status": "knex migrate:status --knexfile knexfile.js",
    "migrate:list": "knex migrate:list --knexfile knexfile.js",
    "migrate:currentVersion": "knex migrate:currentVersion --knexfile knexfile.js",
    "seed:make": "knex seed:make --knexfile knexfile.js",
    "seed:run": "knex seed:run --knexfile knexfile.js"
  }
}
```

**Verification:**
```bash
# Test scripts are available
pnpm run migrate:status
# Should show: "No Completed Migrations" (fresh setup)
```

---

## Day 2: Directory Structure Setup

### Step 2.1: Create Migration Directory Structure

```bash
# Create main migrations directory
New-Item -ItemType Directory -Path "migrations" -Force

# Create subdirectories for organized migrations
New-Item -ItemType Directory -Path "migrations\core" -Force
New-Item -ItemType Directory -Path "migrations\products" -Force
New-Item -ItemType Directory -Path "migrations\products\nexus" -Force
New-Item -ItemType Directory -Path "migrations\products\paylinq" -Force
New-Item -ItemType Directory -Path "migrations\products\schedulehub" -Force
New-Item -ItemType Directory -Path "migrations\products\recruitiq" -Force
New-Item -ItemType Directory -Path "migrations\deployment" -Force
New-Item -ItemType Directory -Path "migrations\data" -Force

# Create scripts directory
New-Item -ItemType Directory -Path "scripts\migrations" -Force

# Create tests directory
New-Item -ItemType Directory -Path "tests\migrations" -Force
```

**Expected Structure:**
```
backend/
├── knexfile.js
├── migrations/
│   ├── core/                 # Platform tables
│   ├── products/             # Product schemas
│   │   ├── nexus/
│   │   ├── paylinq/
│   │   ├── schedulehub/
│   │   └── recruitiq/
│   ├── deployment/           # Deployment service
│   └── data/                 # Seed data migrations
├── scripts/
│   └── migrations/           # Migration utility scripts
└── tests/
    └── migrations/           # Migration tests
```

### Step 2.2: Create Migration Utility Scripts

Create `backend/scripts/migrations/run-migrations.sh`:

```bash
#!/bin/bash
# Run pending database migrations

set -e

echo "🔄 Running database migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

# Run migrations
npx knex migrate:latest --knexfile knexfile.js

# Check status
echo ""
echo "✅ Migrations complete"
echo ""
npx knex migrate:status --knexfile knexfile.js
```

Create `backend/scripts/migrations/rollback.sh`:

```bash
#!/bin/bash
# Rollback last batch of migrations

set -e

echo "⚠️  Rolling back last migration batch..."
echo ""

# Confirm with user
read -p "Are you sure you want to rollback? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Show current status
echo ""
echo "Current migration status:"
npx knex migrate:status --knexfile knexfile.js
echo ""

# Rollback
npx knex migrate:rollback --knexfile knexfile.js

# Show new status
echo ""
echo "✅ Rollback complete"
echo ""
npx knex migrate:status --knexfile knexfile.js
```

Create `backend/scripts/migrations/status.sh`:

```bash
#!/bin/bash
# Show migration status

npx knex migrate:status --knexfile knexfile.js
```

**Make scripts executable:**
```bash
chmod +x scripts/migrations/*.sh
```

### Step 2.3: Create Windows PowerShell Versions

Create `backend/scripts/migrations/run-migrations.ps1`:

```powershell
# Run pending database migrations

Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan

if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

npx knex migrate:latest --knexfile knexfile.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Migrations complete" -ForegroundColor Green
Write-Host ""
npx knex migrate:status --knexfile knexfile.js
```

Create `backend/scripts/migrations/rollback.ps1`:

```powershell
# Rollback last batch of migrations

Write-Host "⚠️  Rolling back last migration batch..." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Are you sure you want to rollback? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Rollback cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Current migration status:" -ForegroundColor Cyan
npx knex migrate:status --knexfile knexfile.js
Write-Host ""

npx knex migrate:rollback --knexfile knexfile.js

Write-Host ""
Write-Host "✅ Rollback complete" -ForegroundColor Green
Write-Host ""
npx knex migrate:status --knexfile knexfile.js
```

---

## Day 3: Create First Migration (Proof of Concept)

### Step 3.1: Create Sample Migration

Create the first migration to test the setup:

```bash
pnpm run migrate:make test_setup
```

This creates: `migrations/YYYYMMDDHHMMSS_test_setup.js`

Edit the file:

```javascript
/**
 * Migration: Test Setup
 * 
 * @description Proof of concept migration to verify Knex.js setup
 * @author DevTeam
 * @date 2025-11-22
 */

export async function up(knex) {
  await knex.schema.createTable('_migration_test', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('test_value', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  
  console.log('✅ Test table created');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('_migration_test');
  
  console.log('✅ Test table dropped');
}
```

### Step 3.2: Test Migration Execution

```bash
# Run the migration
pnpm run migrate:latest

# Check status
pnpm run migrate:status
# Should show: 1 completed migration

# Verify in database
psql -d recruitiq_dev -c "SELECT * FROM knex_migrations;"
psql -d recruitiq_dev -c "\dt _migration_test"
```

### Step 3.3: Test Rollback

```bash
# Rollback the migration
pnpm run migrate:rollback

# Check status
pnpm run migrate:status
# Should show: 0 completed migrations

# Verify table is gone
psql -d recruitiq_dev -c "\dt _migration_test"
# Should show: "Did not find any relation"
```

### Step 3.4: Clean Up Test Migration

If test is successful, delete the test migration file:

```bash
Remove-Item migrations\*_test_setup.js
```

---

## Day 4: Environment Configuration

### Step 4.1: Update .env Files

Ensure database connection strings are correct in all environment files:

**backend/.env** (development):
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq_dev
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=recruitiq_dev
```

**backend/.env.test**:
```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq_test
DB_NAME=recruitiq_test
```

**backend/.env.production.example**:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@production-host:5432/recruitiq_prod
DB_SSL=true
```

### Step 4.2: Update .gitignore

Ensure migration-related files are properly tracked:

```gitignore
# Environment files
.env
.env.local
.env.*.local

# BUT track migration files
!migrations/**/*.js
!seeds/**/*.js

# Don't track test databases
*.db
*.sqlite
*.sqlite3
```

### Step 4.3: Create Migration Conventions Document

Create `backend/migrations/README.md`:

```markdown
# RecruitIQ Database Migrations

This directory contains all database migrations managed by Knex.js.

## Naming Convention

```
YYYYMMDDHHMMSS_descriptive_name.js
```

## Numbering System

- `000xxx` - Core platform (organizations, users, RBAC)
- `100xxx` - Nexus HRIS
- `200xxx` - PayLinQ Payroll
- `300xxx` - ScheduleHub
- `400xxx` - RecruitIQ ATS
- `600xxx` - Deployment Service
- `900xxx` - Seed data

## Creating Migrations

```bash
# Create new migration
pnpm run migrate:make description_of_change

# Move to appropriate subdirectory
# migrations/core/ or migrations/products/paylinq/ etc.
```

## Running Migrations

```bash
# Run all pending migrations
pnpm run migrate:latest

# Check migration status
pnpm run migrate:status

# Rollback last batch
pnpm run migrate:rollback
```

## Migration Template

See [../../docs/migration-setup/TEMPLATES.md](../../docs/migration-setup/TEMPLATES.md) for standard templates.
```

---

## Day 5: Documentation & Validation

### Step 5.1: Create Developer Guide

Create `backend/MIGRATIONS.md`:

```markdown
# Database Migrations Guide

## Quick Start

```bash
# Check current migration status
pnpm run migrate:status

# Run pending migrations
pnpm run migrate:latest

# Create new migration
pnpm run migrate:make my_migration_name
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm run migrate:latest` | Run all pending migrations |
| `pnpm run migrate:status` | Show which migrations have run |
| `pnpm run migrate:rollback` | Undo last batch |
| `pnpm run migrate:make <name>` | Create new migration |

## Migration Rules

1. **Never edit a migration that has run in production**
2. **Always test up AND down migrations**
3. **Use transactions for data migrations**
4. **Include audit columns** (created_at, updated_at, deleted_at)
5. **Filter by organization_id** for tenant isolation
6. **Add indexes** for foreign keys and frequently queried columns

## See Also

- [Migration Setup Documentation](../docs/migration-setup/OVERVIEW.md)
- [Migration Templates](../docs/migration-setup/TEMPLATES.md)
- [Database Standards](../docs/DATABASE_STANDARDS.md)
```

### Step 5.2: Validation Checklist

Run through this checklist:

- [ ] Knex.js installed (`pnpm list knex`)
- [ ] `knexfile.js` created and loads correctly
- [ ] `package.json` scripts added
- [ ] Migration directory structure created
- [ ] Utility scripts created (run, rollback, status)
- [ ] Test migration runs successfully
- [ ] Test migration rolls back successfully
- [ ] Environment files configured
- [ ] `.gitignore` updated
- [ ] Documentation created
- [ ] Team notified of new workflow

### Step 5.3: Create Phase 1 Completion Report

```bash
# Generate migration status report
pnpm run migrate:status > phase1-completion-report.txt

# Add system info
echo "Knex Version: $(pnpm list knex | grep knex)" >> phase1-completion-report.txt
echo "Node Version: $(node --version)" >> phase1-completion-report.txt
echo "Database: $DATABASE_URL" >> phase1-completion-report.txt
```

---

## Troubleshooting

### Issue: "Cannot find module 'knex'"

**Solution:**
```bash
cd backend
pnpm install
pnpm list knex  # Verify installation
```

### Issue: "Connection refused"

**Solution:**
```bash
# Check PostgreSQL is running
Get-Service postgresql*

# Test connection
psql -h localhost -U postgres -d postgres -c "SELECT version();"

# Check .env file
cat .env | grep DATABASE_URL
```

### Issue: "Migration table not found"

**Solution:**
```bash
# Knex creates this automatically on first run
pnpm run migrate:status

# Manually verify
psql -d recruitiq_dev -c "SELECT * FROM knex_migrations;"
```

### Issue: "ES Module error"

**Solution:**
Ensure `backend/package.json` has:
```json
{
  "type": "module"
}
```

---

## Next Steps

Once Phase 1 is complete:

1. ✅ **Phase 1 Complete**: Knex.js is installed and configured
2. ➡️ **Start Phase 2**: Begin converting existing SQL schemas to Knex migrations
3. 📚 **Read Next**: [PHASE2_CONVERSION.md](./PHASE2_CONVERSION.md)

---

## Success Criteria

Phase 1 is complete when:

- [x] Knex.js installed and version confirmed
- [x] `knexfile.js` loads without errors
- [x] All npm scripts work correctly
- [x] Test migration runs and rolls back successfully
- [x] Directory structure created
- [x] Utility scripts functional
- [x] Documentation complete
- [x] Team trained on basic commands

**Estimated Time:** 1 week (5 working days)  
**Actual Time:** _________  
**Blockers:** _________  
**Notes:** _________
