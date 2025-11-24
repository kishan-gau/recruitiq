# Phase 5: Testing & Validation

**Status:** Ready for Implementation  
**Duration:** Week 6 (5 working days)  
**Prerequisites:** Phases 1-4 completed

---

## Overview

Phase 5 establishes comprehensive testing procedures for database migrations, ensuring reliability and data integrity across all environments.

---

## Testing Strategy

```
┌─────────────────────────────────────────────┐
│          Migration Testing Pyramid          │
├─────────────────────────────────────────────┤
│                                             │
│              E2E Tests (10%)                │
│         /                     \             │
│    Integration Tests (30%)                  │
│         /                 \                 │
│    Migration Unit Tests (60%)               │
│         /             \                     │
└─────────────────────────────────────────────┘
```

### Testing Levels

1. **Unit Tests (60%)** - Individual migration up/down
2. **Integration Tests (30%)** - Full migration suite, data migrations
3. **E2E Tests (10%)** - Production-like scenarios, rollback testing

---

## Day 1-2: Migration Unit Tests

### Test Framework Setup

Create `backend/tests/migrations/setup.js`:

```javascript
/**
 * Migration Test Setup
 * 
 * Provides utilities for testing individual migrations
 */

import knex from 'knex';
import config from '../../knexfile.js';

let testDb;

/**
 * Get test database connection
 */
export function getTestDb() {
  if (!testDb) {
    testDb = knex({
      ...config,
      connection: {
        ...config.connection,
        database: 'recruitiq_migration_test'
      }
    });
  }
  return testDb;
}

/**
 * Reset test database to clean state
 */
export async function resetTestDatabase() {
  const db = getTestDb();
  
  // Drop all tables
  await db.raw('DROP SCHEMA IF EXISTS public CASCADE;');
  await db.raw('DROP SCHEMA IF EXISTS hris CASCADE;');
  
  // Recreate schemas
  await db.raw('CREATE SCHEMA public;');
  await db.raw('CREATE SCHEMA hris;');
  
  // Reset migrations table
  await db.raw('DROP TABLE IF EXISTS knex_migrations;');
  await db.raw('DROP TABLE IF EXISTS knex_migrations_lock;');
}

/**
 * Cleanup test database
 */
export async function cleanupTestDatabase() {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}

/**
 * Run a single migration
 */
export async function runMigration(migrationName) {
  const db = getTestDb();
  await db.migrate.up({ name: migrationName });
}

/**
 * Rollback a single migration
 */
export async function rollbackMigration() {
  const db = getTestDb();
  await db.migrate.down();
}

/**
 * Check if table exists
 */
export async function tableExists(tableName, schema = 'public') {
  const db = getTestDb();
  const result = await db.raw(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name = ?
    );
  `, [schema, tableName]);
  
  return result.rows[0].exists;
}

/**
 * Check if column exists
 */
export async function columnExists(tableName, columnName, schema = 'public') {
  const db = getTestDb();
  const result = await db.raw(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = ? 
      AND table_name = ? 
      AND column_name = ?
    );
  `, [schema, tableName, columnName]);
  
  return result.rows[0].exists;
}

/**
 * Check if index exists
 */
export async function indexExists(indexName) {
  const db = getTestDb();
  const result = await db.raw(`
    SELECT EXISTS (
      SELECT FROM pg_indexes 
      WHERE indexname = ?
    );
  `, [indexName]);
  
  return result.rows[0].exists;
}

/**
 * Get table column count
 */
export async function getColumnCount(tableName, schema = 'public') {
  const db = getTestDb();
  const result = await db.raw(`
    SELECT COUNT(*) as count
    FROM information_schema.columns 
    WHERE table_schema = ? 
    AND table_name = ?
  `, [schema, tableName]);
  
  return parseInt(result.rows[0].count);
}
```

### Example Migration Unit Test

Create `backend/tests/migrations/core/20250122000001_create_organizations.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  getTestDb,
  resetTestDatabase,
  cleanupTestDatabase,
  runMigration,
  rollbackMigration,
  tableExists,
  columnExists,
  indexExists,
  getColumnCount
} from '../setup.js';

describe('Migration: 20250122000001_create_organizations', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('up()', () => {
    it('should create organizations table', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const exists = await tableExists('organizations');
      expect(exists).toBe(true);
    });

    it('should have all required columns', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const requiredColumns = [
        'id', 'name', 'slug', 'email', 'phone', 'address',
        'city', 'state', 'country', 'is_active',
        'created_at', 'updated_at', 'deleted_at'
      ];
      
      for (const column of requiredColumns) {
        const exists = await columnExists('organizations', column);
        expect(exists).toBe(true);
      }
    });

    it('should have correct column count', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const count = await getColumnCount('organizations');
      expect(count).toBeGreaterThanOrEqual(20); // Adjust based on actual columns
    });

    it('should create required indexes', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const slugIndex = await indexExists('organizations_slug_index');
      expect(slugIndex).toBe(true);
    });

    it('should allow inserting valid data', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const db = getTestDb();
      await db('organizations').insert({
        name: 'Test Organization',
        slug: 'test-org',
        country: 'Suriname',
        is_active: true
      });
      
      const orgs = await db('organizations').select('*');
      expect(orgs).toHaveLength(1);
      expect(orgs[0].name).toBe('Test Organization');
    });

    it('should enforce unique slug constraint', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const db = getTestDb();
      await db('organizations').insert({
        name: 'Org 1',
        slug: 'test-org',
        country: 'Suriname'
      });
      
      // Should fail due to unique constraint
      await expect(
        db('organizations').insert({
          name: 'Org 2',
          slug: 'test-org',
          country: 'Suriname'
        })
      ).rejects.toThrow();
    });

    it('should have default values', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      const db = getTestDb();
      await db('organizations').insert({
        name: 'Test Org',
        slug: 'test'
      });
      
      const [org] = await db('organizations').select('*');
      expect(org.is_active).toBe(true);
      expect(org.country).toBe('Suriname');
      expect(org.created_at).toBeDefined();
    });
  });

  describe('down()', () => {
    it('should drop organizations table', async () => {
      await runMigration('20250122000001_create_organizations.js');
      
      let exists = await tableExists('organizations');
      expect(exists).toBe(true);
      
      await rollbackMigration();
      
      exists = await tableExists('organizations');
      expect(exists).toBe(false);
    });

    it('should be idempotent (rollback multiple times)', async () => {
      await runMigration('20250122000001_create_organizations.js');
      await rollbackMigration();
      
      // Should not throw on second rollback
      await expect(rollbackMigration()).resolves.not.toThrow();
    });
  });
});
```

### Run Migration Unit Tests

```bash
cd backend

# Run all migration tests
pnpm test:migrations

# Run specific migration test
pnpm test -- create_organizations.test.js

# Run with coverage
pnpm test:migrations:coverage
```

---

## Day 3: Integration Tests

### Full Migration Suite Test

Create `backend/tests/migrations/integration/full-migration.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  getTestDb,
  resetTestDatabase,
  cleanupTestDatabase
} from '../setup.js';

describe('Full Migration Suite Integration', () => {
  let db;

  beforeAll(async () => {
    await resetTestDatabase();
    db = getTestDb();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should run all migrations successfully', async () => {
    await db.migrate.latest();
    
    const [, applied] = await db.migrate.list();
    expect(applied.length).toBeGreaterThan(0);
  });

  it('should have correct table count after all migrations', async () => {
    await db.migrate.latest();
    
    const result = await db.raw(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'hris')
    `);
    
    const tableCount = parseInt(result.rows[0].count);
    expect(tableCount).toBeGreaterThan(50); // Adjust based on actual count
  });

  it('should have all required core tables', async () => {
    await db.migrate.latest();
    
    const coreTables = [
      'organizations',
      'licenses',
      'hris.user_account',
      'platform_roles',
      'platform_permissions',
      'products',
      'product_features'
    ];
    
    for (const table of coreTables) {
      const [schema, tableName] = table.includes('.') 
        ? table.split('.') 
        : ['public', table];
      
      const result = await db.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = ? AND table_name = ?
        );
      `, [schema, tableName]);
      
      expect(result.rows[0].exists).toBe(true);
    }
  });

  it('should have referential integrity (foreign keys)', async () => {
    await db.migrate.latest();
    
    // Test foreign key enforcement
    await expect(
      db('jobs').insert({
        organization_id: '00000000-0000-0000-0000-000000000000', // Non-existent org
        title: 'Test Job'
      })
    ).rejects.toThrow(/foreign key/i);
  });

  it('should rollback all migrations successfully', async () => {
    await db.migrate.latest();
    await db.migrate.rollback(null, true); // Rollback all
    
    const [, applied] = await db.migrate.list();
    expect(applied).toHaveLength(0);
  });

  it('should re-run migrations after rollback', async () => {
    await db.migrate.latest();
    await db.migrate.rollback(null, true);
    await db.migrate.latest();
    
    const [, applied] = await db.migrate.list();
    expect(applied.length).toBeGreaterThan(0);
  });
});
```

### Data Migration Test

Create `backend/tests/migrations/integration/data-migration.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  getTestDb,
  resetTestDatabase,
  cleanupTestDatabase
} from '../setup.js';

describe('Data Migration Integration', () => {
  let db;

  beforeEach(async () => {
    await resetTestDatabase();
    db = getTestDb();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should seed RBAC roles correctly', async () => {
    await db.migrate.latest();
    
    const roles = await db('platform_roles').select('*');
    expect(roles.length).toBeGreaterThan(0);
    
    // Check specific roles exist
    const superAdmin = roles.find(r => r.slug === 'super-admin');
    expect(superAdmin).toBeDefined();
    expect(superAdmin.name).toBe('Super Admin');
  });

  it('should seed products correctly', async () => {
    await db.migrate.latest();
    
    const products = await db('products').select('*');
    expect(products.length).toBe(4); // Nexus, PayLinQ, ScheduleHub, RecruitIQ
    
    const productSlugs = products.map(p => p.slug);
    expect(productSlugs).toContain('nexus');
    expect(productSlugs).toContain('paylinq');
    expect(productSlugs).toContain('schedulehub');
    expect(productSlugs).toContain('recruitiq');
  });

  it('should seed test tenant in dev environment', async () => {
    // Set environment to test
    process.env.NODE_ENV = 'test';
    
    await db.migrate.latest();
    
    const testOrg = await db('organizations')
      .where({ name: 'Test Company' })
      .first();
    
    expect(testOrg).toBeDefined();
    expect(testOrg.slug).toBe('test-company');
  });

  it('should preserve existing data on migration upgrade', async () => {
    // Run initial migrations
    await db.migrate.latest();
    
    // Insert test data
    const [orgId] = await db('organizations').insert({
      name: 'Test Org',
      slug: 'test-org',
      country: 'Suriname'
    }).returning('id');
    
    // Simulate adding new migration and re-running
    // In real scenario, this would be a new migration file
    
    // Verify data still exists
    const org = await db('organizations').where({ id: orgId }).first();
    expect(org).toBeDefined();
    expect(org.name).toBe('Test Org');
  });
});
```

---

## Day 4: E2E Rollback Tests

### Production Scenario Tests

Create `backend/tests/migrations/e2e/production-scenarios.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  getTestDb,
  resetTestDatabase,
  cleanupTestDatabase
} from '../setup.js';

describe('Production Deployment Scenarios (E2E)', () => {
  let db;

  beforeEach(async () => {
    await resetTestDatabase();
    db = getTestDb();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Scenario: Fresh Production Deploy', () => {
    it('should deploy from scratch successfully', async () => {
      // Simulate fresh database
      await resetTestDatabase();
      
      // Run all migrations
      await db.migrate.latest();
      
      // Verify all tables exist
      const result = await db.raw(`
        SELECT COUNT(*) as count
        FROM information_schema.tables 
        WHERE table_schema IN ('public', 'hris')
      `);
      
      expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Production Upgrade', () => {
    it('should upgrade existing database', async () => {
      // Simulate existing production state (run core migrations)
      await db.migrate.up({ name: '20250122000001_create_organizations.js' });
      await db.migrate.up({ name: '20250122000002_create_licenses.js' });
      
      // Insert existing production data
      await db('organizations').insert({
        name: 'Existing Org',
        slug: 'existing',
        country: 'Suriname'
      });
      
      // Run remaining migrations (simulating upgrade)
      await db.migrate.latest();
      
      // Verify data preserved
      const orgs = await db('organizations').select('*');
      expect(orgs.some(o => o.slug === 'existing')).toBe(true);
    });
  });

  describe('Scenario: Failed Migration Rollback', () => {
    it('should rollback on migration failure', async () => {
      // Run migrations up to a point
      await db.migrate.latest();
      
      // Get current state
      const [, applied] = await db.migrate.list();
      const beforeCount = applied.length;
      
      // Simulate failed migration by rolling back
      await db.migrate.rollback();
      
      const [, afterApplied] = await db.migrate.list();
      expect(afterApplied.length).toBeLessThan(beforeCount);
    });
  });

  describe('Scenario: Multi-Step Rollback', () => {
    it('should rollback multiple migrations', async () => {
      await db.migrate.latest();
      
      // Rollback 3 migrations
      await db.migrate.rollback();
      await db.migrate.rollback();
      await db.migrate.rollback();
      
      const [, applied] = await db.migrate.list();
      const [, pending] = await db.migrate.list();
      
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should re-apply after rollback', async () => {
      await db.migrate.latest();
      const [, initialApplied] = await db.migrate.list();
      
      await db.migrate.rollback();
      await db.migrate.rollback();
      
      await db.migrate.latest();
      
      const [, finalApplied] = await db.migrate.list();
      expect(finalApplied.length).toBe(initialApplied.length);
    });
  });
});
```

---

## Day 5: Performance & Load Tests

### Migration Performance Test

Create `backend/tests/migrations/performance/migration-speed.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  getTestDb,
  resetTestDatabase,
  cleanupTestDatabase
} from '../setup.js';

describe('Migration Performance Tests', () => {
  let db;

  beforeAll(async () => {
    await resetTestDatabase();
    db = getTestDb();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should complete all migrations in reasonable time', async () => {
    const startTime = Date.now();
    
    await db.migrate.latest();
    
    const duration = Date.now() - startTime;
    
    // Should complete in under 30 seconds
    expect(duration).toBeLessThan(30000);
    
    console.log(`Migration duration: ${duration}ms`);
  }, 60000); // 60s timeout

  it('should rollback all migrations quickly', async () => {
    await db.migrate.latest();
    
    const startTime = Date.now();
    
    await db.migrate.rollback(null, true);
    
    const duration = Date.now() - startTime;
    
    // Rollback should be fast (under 10 seconds)
    expect(duration).toBeLessThan(10000);
    
    console.log(`Rollback duration: ${duration}ms`);
  }, 60000);
});
```

---

## Test Automation

### Add Test Scripts to package.json

Update `backend/package.json`:

```json
{
  "scripts": {
    "test:migrations": "cross-env NODE_ENV=test jest tests/migrations --runInBand",
    "test:migrations:unit": "cross-env NODE_ENV=test jest tests/migrations/core tests/migrations/products --runInBand",
    "test:migrations:integration": "cross-env NODE_ENV=test jest tests/migrations/integration --runInBand",
    "test:migrations:e2e": "cross-env NODE_ENV=test jest tests/migrations/e2e --runInBand",
    "test:migrations:coverage": "cross-env NODE_ENV=test jest tests/migrations --coverage --runInBand",
    "test:migrations:watch": "cross-env NODE_ENV=test jest tests/migrations --watch --runInBand"
  }
}
```

### CI/CD Integration

Update `.github/workflows/test.yml`:

```yaml
name: Test Migrations

on:
  pull_request:
    paths:
      - 'backend/migrations/**'
      - 'backend/tests/migrations/**'

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: recruitiq_migration_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run migration tests
        run: |
          cd backend
          npm run test:migrations:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/recruitiq_migration_test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage/lcov.info
          flags: migrations
```

---

## Success Criteria

Phase 5 is complete when:

- [ ] Migration unit tests created for all tables
- [ ] Integration tests cover full migration suite
- [ ] E2E tests cover production scenarios
- [ ] Performance tests show acceptable migration speed
- [ ] All tests passing consistently
- [ ] Test coverage > 80% for migrations
- [ ] CI/CD pipeline includes migration tests
- [ ] Documentation updated with test examples

**Estimated Time:** 1 week (5 working days)  
**Actual Time:** _________  
**Blockers:** _________  
**Notes:** _________

---

## Next Steps

Once Phase 5 is complete:

1. ✅ **Phase 5 Complete**: Testing infrastructure in place
2. ✅ **All Phases Complete**: Knex.js migration system fully implemented
3. 📚 **Reference**: [ROLLBACK.md](./ROLLBACK.md) for emergency procedures
