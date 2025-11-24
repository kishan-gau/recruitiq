# Database Migration Guide

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**Status:** Active

---

## Overview

This guide provides detailed procedures for migrating database credentials and connection strings from `.env` files to Barbican secret management.

**Migration Scope:**
- PostgreSQL connection strings
- Database credentials (username, password)
- Connection pool configurations
- SSL/TLS certificates for database connections

---

## Pre-Migration Database State

### Current Configuration

**File:** `backend/.env`

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq
DATABASE_NAME=recruitiq
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Connection Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=2000

# SSL Configuration
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

### Current Database Module

**File:** `backend/src/config/database.js`

```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 2000,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  } : false
});

export default pool;
```

---

## Migration Steps

### Step 1: Generate Database Secrets in Barbican

**Script:** `backend/scripts/generate-database-secrets.js`

```javascript
import secretsManager from '../src/services/SecretsManager.js';
import crypto from 'crypto';

async function generateDatabaseSecrets() {
  console.log('Generating database secrets in Barbican...\n');

  try {
    // 1. Generate database password (if not migrating existing)
    const dbPasswordRef = await secretsManager.generateSecret('DB_PASSWORD', {
      algorithm: 'aes',
      bit_length: 256,
      mode: 'cbc',
      secret_type: 'symmetric',
      metadata: {
        purpose: 'PostgreSQL database password',
        environment: process.env.NODE_ENV || 'development',
        rotationPolicy: '90_days'
      }
    });

    console.log('✓ Generated DB_PASSWORD');
    console.log(`  Secret Ref: ${dbPasswordRef}`);

    // 2. Store database username (plaintext secret)
    const dbUsernameRef = await secretsManager.createSecret('DB_USERNAME', 'postgres', {
      secret_type: 'opaque',
      metadata: {
        purpose: 'PostgreSQL database username',
        environment: process.env.NODE_ENV || 'development'
      }
    });

    console.log('✓ Stored DB_USERNAME');
    console.log(`  Secret Ref: ${dbUsernameRef}`);

    // 3. Store database host
    const dbHostRef = await secretsManager.createSecret('DB_HOST', 'localhost', {
      secret_type: 'opaque',
      metadata: {
        purpose: 'PostgreSQL database host',
        environment: process.env.NODE_ENV || 'development'
      }
    });

    console.log('✓ Stored DB_HOST');
    console.log(`  Secret Ref: ${dbHostRef}`);

    // 4. Store database name
    const dbNameRef = await secretsManager.createSecret('DB_NAME', 'recruitiq', {
      secret_type: 'opaque',
      metadata: {
        purpose: 'PostgreSQL database name',
        environment: process.env.NODE_ENV || 'development'
      }
    });

    console.log('✓ Stored DB_NAME');
    console.log(`  Secret Ref: ${dbNameRef}`);

    // 5. Store database port
    const dbPortRef = await secretsManager.createSecret('DB_PORT', '5432', {
      secret_type: 'opaque',
      metadata: {
        purpose: 'PostgreSQL database port',
        environment: process.env.NODE_ENV || 'development'
      }
    });

    console.log('✓ Stored DB_PORT');
    console.log(`  Secret Ref: ${dbPortRef}`);

    console.log('\n✅ All database secrets generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update backend/src/config/database.js to use SecretsManager');
    console.log('2. Test database connectivity');
    console.log('3. Remove database credentials from .env file');

  } catch (error) {
    console.error('❌ Error generating database secrets:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDatabaseSecrets();
}

export default generateDatabaseSecrets;
```

**Run Script:**

```powershell
cd backend
node scripts/generate-database-secrets.js
```

**Expected Output:**

```
Generating database secrets in Barbican...

✓ Generated DB_PASSWORD
  Secret Ref: https://barbican:9311/v1/secrets/abc123...
✓ Stored DB_USERNAME
  Secret Ref: https://barbican:9311/v1/secrets/def456...
✓ Stored DB_HOST
  Secret Ref: https://barbican:9311/v1/secrets/ghi789...
✓ Stored DB_NAME
  Secret Ref: https://barbican:9311/v1/secrets/jkl012...
✓ Stored DB_PORT
  Secret Ref: https://barbican:9311/v1/secrets/mno345...

✅ All database secrets generated successfully!
```

### Step 2: Migrate Existing Database Password (Optional)

If you want to migrate your existing database password instead of generating a new one:

**Script:** `backend/scripts/migrate-database-password.js`

```javascript
import secretsManager from '../src/services/SecretsManager.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateExistingPassword() {
  console.log('Migrating existing database password to Barbican...\n');

  const existingPassword = process.env.DATABASE_PASSWORD;

  if (!existingPassword) {
    console.error('❌ DATABASE_PASSWORD not found in .env file');
    process.exit(1);
  }

  try {
    const dbPasswordRef = await secretsManager.createSecret('DB_PASSWORD', existingPassword, {
      secret_type: 'opaque',
      metadata: {
        purpose: 'PostgreSQL database password',
        environment: process.env.NODE_ENV || 'development',
        migrated: true,
        migrationDate: new Date().toISOString()
      }
    });

    console.log('✓ Migrated existing DB_PASSWORD');
    console.log(`  Secret Ref: ${dbPasswordRef}`);
    console.log('\n✅ Database password migrated successfully!');

  } catch (error) {
    console.error('❌ Error migrating database password:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingPassword();
}

export default migrateExistingPassword;
```

### Step 3: Update Database Configuration Module

**File:** `backend/src/config/database.js`

**Before:**

```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 2000,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  } : false
});

export default pool;
```

**After:**

```javascript
import pg from 'pg';
import secretsManager from '../services/SecretsManager.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

/**
 * Creates and configures PostgreSQL connection pool with Barbican secrets
 * @returns {Promise<Pool>} Configured PostgreSQL pool
 */
async function createDatabasePool() {
  try {
    // Retrieve database credentials from Barbican
    const [dbHost, dbPort, dbName, dbUsername, dbPassword] = await Promise.all([
      secretsManager.getSecret('DB_HOST'),
      secretsManager.getSecret('DB_PORT'),
      secretsManager.getSecret('DB_NAME'),
      secretsManager.getSecret('DB_USERNAME'),
      secretsManager.getSecret('DB_PASSWORD')
    ]);

    // Create pool with retrieved credentials
    const pool = new Pool({
      host: dbHost,
      port: parseInt(dbPort) || 5432,
      database: dbName,
      user: dbUsername,
      password: dbPassword,
      
      // Connection pool configuration (from env or defaults)
      max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
      min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 2000,
      
      // SSL configuration
      ssl: process.env.DATABASE_SSL === 'true' ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      } : false
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database pool initialized successfully', {
      host: dbHost,
      database: dbName,
      poolMax: pool.options.max
    });

    return pool;

  } catch (error) {
    logger.error('Failed to initialize database pool', {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

// Initialize pool (async)
let pool;
const poolPromise = createDatabasePool().then(p => {
  pool = p;
  return p;
});

// Handle pool errors
poolPromise.catch(error => {
  logger.error('Database pool initialization error', { error: error.message });
  process.exit(1);
});

// Export pool (will be available after initialization)
export default pool;
export { poolPromise };
```

### Step 4: Update Custom Query Wrapper

**File:** `backend/src/config/query.js`

Ensure the custom query wrapper waits for pool initialization:

```javascript
import { poolPromise } from './database.js';
import logger from '../utils/logger.js';

/**
 * Custom query wrapper with security and monitoring
 * Waits for pool initialization before executing queries
 */
export async function query(text, params = [], organizationId = null, options = {}) {
  const startTime = Date.now();
  
  try {
    // Wait for pool to be initialized
    const pool = await poolPromise;
    
    // Validate organization_id filter
    if (organizationId && !text.toLowerCase().includes('organization_id')) {
      logger.warn('Query missing organization_id filter', {
        query: text,
        organizationId,
        table: options.table
      });
      
      if (process.env.STRICT_TENANT_ISOLATION === 'true') {
        throw new Error('Query must filter by organization_id');
      }
    }
    
    // Execute query
    const result = await pool.query(text, params);
    
    // Log performance
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        duration,
        query: text,
        table: options.table,
        operation: options.operation
      });
    }
    
    return result;
    
  } catch (error) {
    logger.error('Database query failed', {
      error: error.message,
      query: text,
      organizationId,
      table: options.table
    });
    throw error;
  }
}

export default query;
```

### Step 5: Update Server Startup

**File:** `backend/src/server.js`

Ensure server waits for database initialization:

```javascript
import express from 'express';
import { poolPromise } from './config/database.js';
import logger from './utils/logger.js';

const app = express();

// ... middleware setup ...

/**
 * Start server after database is initialized
 */
async function startServer() {
  try {
    // Wait for database pool to initialize
    await poolPromise;
    logger.info('Database pool ready');

    // Wait for SecretsManager to initialize
    const secretsManager = (await import('./services/SecretsManager.js')).default;
    await secretsManager.initialize();
    logger.info('SecretsManager initialized');

    // Start HTTP server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    logger.error('Server startup failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start server
startServer();

export default app;
```

### Step 6: Test Database Connectivity

**Script:** `backend/scripts/test-database-connection.js`

```javascript
import { poolPromise } from '../src/config/database.js';
import logger from '../src/utils/logger.js';

async function testDatabaseConnection() {
  console.log('Testing database connection with Barbican secrets...\n');

  try {
    // Wait for pool initialization
    const pool = await poolPromise;
    console.log('✓ Database pool initialized');

    // Test connection
    const client = await pool.connect();
    console.log('✓ Database connection acquired');

    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✓ Test query executed');

    console.log('\nDatabase Information:');
    console.log(`  Current Time: ${result.rows[0].current_time}`);
    console.log(`  PostgreSQL Version: ${result.rows[0].pg_version}`);

    // Test organization query (tenant isolation)
    const orgResult = await client.query(`
      SELECT COUNT(*) as org_count FROM organizations WHERE deleted_at IS NULL
    `);
    console.log(`  Organizations: ${orgResult.rows[0].org_count}`);

    client.release();
    console.log('✓ Connection released');

    // Close pool
    await pool.end();
    console.log('✓ Pool closed');

    console.log('\n✅ Database connection test successful!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database connection test failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

testDatabaseConnection();
```

**Run Test:**

```powershell
cd backend
node scripts/test-database-connection.js
```

**Expected Output:**

```
Testing database connection with Barbican secrets...

✓ Database pool initialized
✓ Database connection acquired
✓ Test query executed

Database Information:
  Current Time: 2025-11-22 10:30:45
  PostgreSQL Version: PostgreSQL 14.5 on x86_64-pc-linux-gnu
  Organizations: 3
✓ Connection released
✓ Pool closed

✅ Database connection test successful!
```

### Step 7: Update Environment Files

**File:** `backend/.env`

**Before:**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq
DATABASE_NAME=recruitiq
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

**After:**

```env
# Database credentials now managed by Barbican
# Only connection pool configuration remains

DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=2000
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

### Step 8: Update .env.example

**File:** `backend/.env.example`

```env
# Database Configuration
# Note: Database credentials (host, port, name, username, password) are managed by Barbican
# See docs/secrets-management/BARBICAN_SECRET_GENERATION.md for setup

# Connection Pool Configuration
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=2000

# SSL Configuration
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# Barbican Configuration
BARBICAN_ENDPOINT=http://localhost:9311
KEYSTONE_ENDPOINT=http://localhost:5000
BARBICAN_PROJECT_ID=your-project-id
```

---

## Validation Procedures

### Validation Checklist

- [ ] **Database pool initializes successfully**
  - Run server and check logs for "Database pool ready"
  - No errors during pool creation

- [ ] **Database queries execute successfully**
  - Run test script: `node scripts/test-database-connection.js`
  - All queries complete without errors

- [ ] **Tenant isolation maintained**
  - All queries filter by `organization_id`
  - No cross-tenant data leakage

- [ ] **Connection pooling works correctly**
  - Multiple concurrent queries handled
  - Connections released properly
  - Pool limits respected

- [ ] **Performance acceptable**
  - Query latency < 100ms (with caching)
  - Pool acquisition < 50ms
  - No connection timeouts

- [ ] **Error handling functional**
  - Invalid credentials fail gracefully
  - Connection errors logged properly
  - Retry logic works as expected

### Validation Tests

**Test 1: Basic Connectivity**

```powershell
cd backend
node scripts/test-database-connection.js
```

**Test 2: Run Integration Tests**

```powershell
cd backend
npm run test:integration
```

**Test 3: Load Testing**

```powershell
cd backend
node scripts/load-test-database.js
```

**Test 4: Smoke Tests**

```powershell
cd backend
npm run test:smoke
```

---

## Rollback Procedures

### Rollback Trigger Conditions

Rollback database migration if:
- Database connection fails consistently
- Query performance degrades >50%
- Tenant isolation is compromised
- Critical data access issues

### Rollback Steps

**Step 1: Restore .env File**

```powershell
# Restore from backup
cp backend/.env.backup backend/.env
```

**Step 2: Revert database.js Changes**

```powershell
git checkout HEAD -- backend/src/config/database.js
```

**Step 3: Restart Services**

```powershell
cd backend
npm restart
```

**Step 4: Validate Rollback**

```powershell
node scripts/test-database-connection.js
```

**Step 5: Notify Team**

```
Subject: Database Migration Rollback Executed

The database migration to Barbican has been rolled back due to [reason].

Status: System operational on previous configuration
Next Steps: Root cause analysis, remediation plan

Contact: [Migration Lead]
```

---

## Troubleshooting

### Issue: "Pool initialization timeout"

**Symptoms:** Server fails to start, "Database pool initialization timeout" error

**Cause:** Barbican not accessible or secrets not found

**Solution:**
```powershell
# 1. Verify Barbican is running
curl http://localhost:9311/v1

# 2. Verify secrets exist
node scripts/list-secrets.js | grep DB_

# 3. Check network connectivity
Test-NetConnection -ComputerName localhost -Port 9311

# 4. Restart Barbican if needed
docker restart barbican
```

### Issue: "Authentication failed for user"

**Symptoms:** Database connection fails, authentication error in logs

**Cause:** Incorrect password retrieved from Barbican

**Solution:**
```powershell
# 1. Verify password in Barbican
node scripts/get-secret.js DB_PASSWORD

# 2. Test password manually
psql -h localhost -U postgres -d recruitiq

# 3. Regenerate password if needed
node scripts/generate-database-secrets.js --force
```

### Issue: "Too many database connections"

**Symptoms:** "sorry, too many clients already" error

**Cause:** Connection pool misconfigured or leaking connections

**Solution:**
```javascript
// Update pool configuration
DATABASE_POOL_MAX=10  // Reduce max connections

// Check for connection leaks in code
// Ensure client.release() called in all code paths
```

### Issue: "Slow query performance"

**Symptoms:** Queries taking >1 second, degraded performance

**Cause:** Missing indexes, inefficient queries, or high latency to Barbican

**Solution:**
```javascript
// 1. Enable SecretsManager caching
SECRETS_CACHE_TTL=300  // 5 minutes

// 2. Check query performance
EXPLAIN ANALYZE SELECT * FROM jobs WHERE organization_id = '...';

// 3. Add missing indexes
CREATE INDEX idx_jobs_org_id ON jobs(organization_id) WHERE deleted_at IS NULL;
```

---

## Post-Migration Monitoring

### Metrics to Monitor

**Database Performance:**
- Query latency (p50, p95, p99)
- Connection pool utilization
- Active connections
- Query throughput (queries/second)

**SecretsManager Performance:**
- Secret retrieval latency
- Cache hit rate
- Cache miss rate
- Barbican API errors

**Application Health:**
- Error rates
- Request latency
- Database connection errors
- Authentication failures

### Monitoring Dashboard Queries

**Grafana/Prometheus Queries:**

```promql
# Database connection pool utilization
rate(pg_pool_size{state="idle"}[5m]) / rate(pg_pool_size{state="total"}[5m])

# Query latency
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))

# Secret retrieval latency
histogram_quantile(0.95, rate(secrets_manager_get_duration_seconds_bucket[5m]))

# Cache hit rate
rate(secrets_manager_cache_hits[5m]) / rate(secrets_manager_cache_total[5m])
```

---

## Next Steps

After completing database migration:

1. ✅ **Proceed to code migration:** [04-code-migration-guide.md](./04-code-migration-guide.md)
2. ✅ **Run comprehensive tests:** [05-testing-strategy.md](./05-testing-strategy.md)
3. ✅ **Prepare rollback procedures:** [06-rollback-procedures.md](./06-rollback-procedures.md)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-22 | Migration Team | Initial version |
