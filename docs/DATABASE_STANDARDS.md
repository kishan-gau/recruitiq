# Database Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Database Principles](#database-principles)
2. [Custom Query Wrapper](#custom-query-wrapper)
3. [Schema Standards](#schema-standards)
4. [Transaction Patterns](#transaction-patterns)
5. [Migration Standards](#migration-standards)
6. [Indexing Guidelines](#indexing-guidelines)
7. [Query Optimization](#query-optimization)
8. [Connection Management](#connection-management)

---

## Database Principles

### Core Database Rules (MANDATORY)

1. **NEVER use `pool.query()` directly** - Always use custom `query()` wrapper
2. **ALWAYS filter by `organization_id`** - Enforce tenant isolation
3. **ALWAYS use parameterized queries** - Prevent SQL injection
4. **ALWAYS use transactions** for multi-step operations
5. **ALWAYS use soft deletes** - Never hard delete data
6. **ALWAYS include audit columns** - `created_at`, `updated_at`, `created_by`, `updated_by`
7. **NEVER expose database errors** to clients
8. **ALWAYS use snake_case** for table and column names
9. **ALWAYS index foreign keys** and frequently queried columns
10. **ALWAYS validate UUIDs** before querying

---

## Custom Query Wrapper

### ⚠️ CRITICAL: Why Use the Custom Wrapper

The custom query wrapper provides:
- **Tenant isolation enforcement** - Automatically validates organization_id
- **SQL injection detection** - Monitors for suspicious patterns
- **Query logging** - Tracks all database operations
- **Performance monitoring** - Measures query execution time
- **Error handling** - Standardized error messages

### Custom Query Wrapper Usage (MANDATORY)

```javascript
import { query } from '../database/query.js';

// ❌ WRONG: Direct pool.query()
const result = await pool.query(
  'SELECT * FROM jobs WHERE id = $1',
  [jobId]
);

// ✅ CORRECT: Custom query wrapper
const result = await query(
  'SELECT * FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
  [jobId, organizationId],
  organizationId,  // Required for tenant isolation
  {
    operation: 'SELECT',
    table: 'jobs',
    userId: userId  // Optional: for audit logging
  }
);
```

### Wrapper Implementation Reference

```javascript
import pool from './pool.js';
import logger from '../utils/logger.js';

/**
 * Custom query wrapper with security and monitoring
 * 
 * @param {string} text - SQL query with parameterized placeholders
 * @param {Array} params - Query parameters
 * @param {string} organizationId - Organization ID for tenant isolation
 * @param {Object} options - Additional options
 * @param {string} options.operation - SQL operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} options.table - Table name being queried
 * @param {string} options.userId - User performing the operation
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params = [], organizationId = null, options = {}) {
  const startTime = Date.now();
  
  try {
    // 1. Validate organization_id for multi-tenant queries
    if (organizationId && !text.toLowerCase().includes('organization_id')) {
      logger.warn('Query missing organization_id filter', {
        query: text,
        organizationId,
        table: options.table
      });
      
      // In strict mode, throw error
      if (process.env.STRICT_TENANT_ISOLATION === 'true') {
        throw new Error('Query must filter by organization_id');
      }
    }
    
    // 2. SQL injection detection
    detectSQLInjection(text, params);
    
    // 3. Execute query
    const result = await pool.query(text, params);
    
    // 4. Log query performance
    const duration = Date.now() - startTime;
    
    if (duration > 1000) { // Slow query threshold
      logger.warn('Slow query detected', {
        duration,
        query: text,
        table: options.table,
        operation: options.operation
      });
    }
    
    // 5. Log for audit trail
    logger.logDatabaseOperation({
      operation: options.operation,
      table: options.table,
      organizationId,
      userId: options.userId,
      duration,
      rowCount: result.rowCount
    });
    
    return result;
    
  } catch (error) {
    // Log error
    logger.error('Database query failed', {
      error: error.message,
      query: text,
      organizationId,
      table: options.table
    });
    
    // Don't expose internal errors to client
    throw new DatabaseError('Database operation failed');
  }
}

/**
 * Detects potential SQL injection attempts
 */
function detectSQLInjection(query, params) {
  const suspiciousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER)/i,
    /UNION\s+SELECT/i,
    /--/,
    /\/\*/,
    /xp_/i,
    /sp_/i
  ];
  
  const queryString = `${query} ${params.join(' ')}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(queryString)) {
      logger.logSecurityEvent('sql_injection_attempt', {
        query,
        params,
        pattern: pattern.toString()
      });
      
      throw new SecurityError('Suspicious SQL pattern detected');
    }
  }
}
```

---

## Schema Standards

### Naming Conventions

```sql
-- ✅ CORRECT: snake_case for tables and columns
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  application_status VARCHAR(50) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP
);

-- ❌ WRONG: camelCase or PascalCase
CREATE TABLE JobApplications (
  Id UUID PRIMARY KEY,
  JobId UUID,
  candidateId UUID
);
```

### Required Columns (MANDATORY)

Every table MUST have:

```sql
CREATE TABLE example_table (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant Isolation (REQUIRED for all tenant-scoped tables)
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Audit Columns (REQUIRED)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Soft Delete (REQUIRED)
  deleted_at TIMESTAMP,
  
  -- Business columns
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'archived'))
);
```

### Standard Table Templates

#### Tenant-Scoped Table

```sql
CREATE TABLE jobs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant Isolation
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Business Columns
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(100),
  location VARCHAR(255),
  employment_type VARCHAR(50) NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  
  -- Audit Columns
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  CONSTRAINT check_salary CHECK (salary_max IS NULL OR salary_max >= salary_min)
);

-- Indexes (REQUIRED)
CREATE INDEX idx_jobs_organization_id ON jobs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status ON jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC) WHERE deleted_at IS NULL;
```

#### Junction Table (Many-to-Many)

```sql
CREATE TABLE job_skills (
  -- Composite Primary Key
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  
  -- Tenant Isolation
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Business Columns
  proficiency_level VARCHAR(50) NOT NULL DEFAULT 'required',
  years_required INTEGER,
  
  -- Audit Columns
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  PRIMARY KEY (job_id, skill_id),
  CONSTRAINT check_proficiency CHECK (proficiency_level IN ('required', 'preferred', 'nice_to_have'))
);

-- Indexes
CREATE INDEX idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX idx_job_skills_skill_id ON job_skills(skill_id);
CREATE INDEX idx_job_skills_organization_id ON job_skills(organization_id);
```

### Data Types Standards

```sql
-- ✅ CORRECT: Appropriate data types
CREATE TABLE candidates (
  id UUID PRIMARY KEY,                          -- UUIDs for primary keys
  email VARCHAR(255) NOT NULL,                  -- VARCHAR with limits
  phone VARCHAR(20),                            -- VARCHAR for phone numbers
  resume_url TEXT,                              -- TEXT for long content
  years_experience INTEGER,                     -- INTEGER for whole numbers
  desired_salary NUMERIC(10, 2),               -- NUMERIC for money
  is_active BOOLEAN NOT NULL DEFAULT true,     -- BOOLEAN for true/false
  last_contact_date DATE,                      -- DATE for dates without time
  created_at TIMESTAMP NOT NULL,               -- TIMESTAMP for date+time
  metadata JSONB                               -- JSONB for flexible data
);

-- ❌ WRONG: Inappropriate data types
CREATE TABLE candidates (
  id INTEGER PRIMARY KEY,                      -- Don't use INTEGER for IDs
  email TEXT,                                  -- Too permissive
  phone INTEGER,                               -- Can't store +, (), -
  is_active INTEGER,                           -- Use BOOLEAN, not INTEGER
  created_at VARCHAR(50)                       -- Use TIMESTAMP, not VARCHAR
);
```

---

## Transaction Patterns

### When to Use Transactions

Use transactions for:
- Multiple related INSERTs
- UPDATE + INSERT combinations
- DELETE with cascading effects
- Any operation that must be atomic

```javascript
import pool from '../database/pool.js';
import { query } from '../database/query.js';

/**
 * Creates a job application with related records
 */
async function createApplication(data, organizationId, userId) {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Insert application
    const applicationResult = await client.query(`
      INSERT INTO applications (
        job_id, candidate_id, organization_id,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [data.jobId, data.candidateId, organizationId, 'pending', userId]);
    
    const application = applicationResult.rows[0];
    
    // 2. Insert activity log
    await client.query(`
      INSERT INTO activity_logs (
        entity_type, entity_id, action,
        organization_id, user_id
      ) VALUES ($1, $2, $3, $4, $5)
    `, ['application', application.id, 'created', organizationId, userId]);
    
    // 3. Update candidate status
    await client.query(`
      UPDATE candidates
      SET status = 'applied', updated_at = NOW(), updated_by = $1
      WHERE id = $2 AND organization_id = $3
    `, [userId, data.candidateId, organizationId]);
    
    // 4. Send notification (if fails, rollback)
    await sendApplicationNotification(application);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return application;
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    
    logger.error('Transaction failed', {
      error: error.message,
      organizationId,
      userId
    });
    
    throw new DatabaseError('Failed to create application');
    
  } finally {
    // Always release client
    client.release();
  }
}
```

### Transaction Helper Function

```javascript
/**
 * Executes a function within a transaction
 * @param {Function} callback - Async function to execute
 * @returns {Promise} Result of callback
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Usage
const result = await withTransaction(async (client) => {
  // All queries use client instead of pool
  await client.query('INSERT INTO...', []);
  await client.query('UPDATE...', []);
  
  return { success: true };
});
```

---

## Migration Standards

### Migration File Naming

```
YYYYMMDDHHMMSS_description_of_change.sql

Examples:
20250103143022_create_jobs_table.sql
20250103143045_add_salary_columns_to_jobs.sql
20250103143100_create_index_on_jobs_status.sql
```

### Migration Template

```sql
-- Migration: 20250103143022_create_jobs_table.sql
-- Description: Creates the jobs table with all required columns and indexes
-- Author: John Doe
-- Date: 2025-01-03

-- === UP Migration ===

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  CONSTRAINT check_jobs_status CHECK (status IN ('draft', 'open', 'closed', 'archived'))
);

-- Create indexes
CREATE INDEX idx_jobs_organization_id ON jobs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status ON jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO recruitiq_app;

-- Add comment
COMMENT ON TABLE jobs IS 'Stores job postings for organizations';

COMMIT;

-- === DOWN Migration ===

BEGIN;

DROP TABLE IF EXISTS jobs CASCADE;

COMMIT;
```

### Migration Best Practices

```sql
-- ✅ CORRECT: Idempotent migrations
CREATE TABLE IF NOT EXISTS jobs (...);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary INTEGER;
DROP INDEX IF EXISTS idx_jobs_status;

-- ✅ CORRECT: Add columns with defaults
ALTER TABLE jobs 
ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft';

-- ❌ WRONG: Non-nullable column without default
ALTER TABLE jobs 
ADD COLUMN status VARCHAR(50) NOT NULL; -- Will fail if rows exist!

-- ✅ CORRECT: Backfill data in separate step
-- Step 1: Add nullable column
ALTER TABLE jobs ADD COLUMN status VARCHAR(50);

-- Step 2: Backfill data
UPDATE jobs SET status = 'open' WHERE status IS NULL;

-- Step 3: Make non-nullable
ALTER TABLE jobs ALTER COLUMN status SET NOT NULL;

-- ✅ CORRECT: Rename column safely
ALTER TABLE jobs RENAME COLUMN old_name TO new_name;
```

---

## Indexing Guidelines

### When to Create Indexes

Create indexes for:
- Foreign keys (ALWAYS)
- Columns used in WHERE clauses frequently
- Columns used in JOIN conditions
- Columns used in ORDER BY
- Columns used in GROUP BY
- Partial indexes for common filters

```sql
-- ✅ CORRECT: Index on foreign key
CREATE INDEX idx_applications_job_id ON applications(job_id);

-- ✅ CORRECT: Composite index for common query
CREATE INDEX idx_jobs_org_status 
ON jobs(organization_id, status) 
WHERE deleted_at IS NULL;

-- ✅ CORRECT: Partial index (more efficient)
CREATE INDEX idx_jobs_open 
ON jobs(organization_id, created_at DESC) 
WHERE status = 'open' AND deleted_at IS NULL;

-- ✅ CORRECT: Index for text search
CREATE INDEX idx_jobs_title_trgm 
ON jobs USING gin(title gin_trgm_ops);

-- ❌ WRONG: Over-indexing
CREATE INDEX idx_jobs_every_column ON jobs(col1, col2, col3, col4, col5, col6);
```

### Index Naming Convention

```
idx_{table}_{columns}

Examples:
idx_jobs_organization_id
idx_jobs_org_status
idx_applications_candidate_id
idx_users_email
```

---

## Query Optimization

### Query Performance Guidelines

```javascript
// ❌ WRONG: N+1 query problem
const jobs = await query(
  'SELECT * FROM jobs WHERE organization_id = $1',
  [organizationId],
  organizationId
);

for (const job of jobs.rows) {
  // N additional queries!
  const applications = await query(
    'SELECT * FROM applications WHERE job_id = $1',
    [job.id],
    organizationId
  );
  job.applications = applications.rows;
}

// ✅ CORRECT: Single query with JOIN
const jobs = await query(`
  SELECT 
    j.*,
    json_agg(
      json_build_object(
        'id', a.id,
        'status', a.status,
        'created_at', a.created_at
      )
    ) FILTER (WHERE a.id IS NOT NULL) as applications
  FROM jobs j
  LEFT JOIN applications a ON j.id = a.job_id AND a.deleted_at IS NULL
  WHERE j.organization_id = $1
    AND j.deleted_at IS NULL
  GROUP BY j.id
`, [organizationId], organizationId);

// ✅ CORRECT: Pagination for large result sets
const jobs = await query(`
  SELECT *
  FROM jobs
  WHERE organization_id = $1
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`, [organizationId, limit, offset], organizationId);

// ✅ CORRECT: Use EXISTS instead of COUNT for existence check
const hasApplications = await query(`
  SELECT EXISTS(
    SELECT 1 
    FROM applications
    WHERE job_id = $1
      AND organization_id = $2
      AND deleted_at IS NULL
  ) as exists
`, [jobId, organizationId], organizationId);

// ❌ WRONG: Loading entire table
SELECT * FROM applications; // Could be millions of rows!

// ✅ CORRECT: Use specific columns and filters
SELECT id, status, created_at
FROM applications
WHERE organization_id = $1
  AND status IN ('pending', 'reviewing')
  AND deleted_at IS NULL
LIMIT 100;
```

### Query Patterns

```sql
-- ✅ CORRECT: Efficient search with ILIKE and index
SELECT *
FROM jobs
WHERE organization_id = $1
  AND title ILIKE $2 || '%'  -- Use prefix matching
  AND deleted_at IS NULL
LIMIT 50;

-- ✅ CORRECT: Date range queries
SELECT *
FROM jobs
WHERE organization_id = $1
  AND created_at >= $2
  AND created_at < $3
  AND deleted_at IS NULL;

-- ✅ CORRECT: Using window functions for ranking
SELECT *,
  ROW_NUMBER() OVER (
    PARTITION BY organization_id 
    ORDER BY created_at DESC
  ) as row_num
FROM jobs
WHERE organization_id = $1
  AND deleted_at IS NULL
LIMIT 10;

-- ✅ CORRECT: CTE for complex queries
WITH recent_applications AS (
  SELECT job_id, COUNT(*) as app_count
  FROM applications
  WHERE organization_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
    AND deleted_at IS NULL
  GROUP BY job_id
)
SELECT j.*, COALESCE(ra.app_count, 0) as recent_applications
FROM jobs j
LEFT JOIN recent_applications ra ON j.id = ra.job_id
WHERE j.organization_id = $1
  AND j.deleted_at IS NULL
ORDER BY ra.app_count DESC NULLS LAST;
```

---

## Connection Management

### Connection Pool Configuration

```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: 20,                    // Maximum connections
  min: 2,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for acquiring connection
  
  // SSL configuration (production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Statement timeout
  statement_timeout: 30000 // 30 seconds max per query
});

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  logger.info('Database pool closed');
});

export default pool;
```

### Connection Best Practices

```javascript
// ✅ CORRECT: Release connections
const client = await pool.connect();
try {
  await client.query('...');
} finally {
  client.release(); // ALWAYS release!
}

// ✅ CORRECT: Use pool for single queries
const result = await pool.query('SELECT...', []);

// ❌ WRONG: Not releasing client
const client = await pool.connect();
await client.query('...');
// Client never released - pool exhaustion!
```

---

**Next:** [API Standards](./API_STANDARDS.md)
