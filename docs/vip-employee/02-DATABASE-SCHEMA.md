# VIP Employee Access Control - Implementation Plan (Part 2: Database Schema)

**Part:** 2 of 7  
**Focus:** Database Schema Changes & Migrations  
**Previous:** [Part 1: Overview](./01-IMPLEMENTATION-PLAN-OVERVIEW.md)  
**Next:** [Part 3: Backend Implementation](./03-BACKEND-IMPLEMENTATION.md)

---

## Database Schema Changes

### Overview

This section details all database schema changes required to support VIP Employee Access Control. All changes follow PostgreSQL best practices and maintain backward compatibility.

---

## 1. Employee Table Modifications

### Add VIP Columns to hris.employee

**File:** `backend/src/database/migrations/20251121_add_vip_employee_columns.sql`

```sql
-- =====================================================
-- Migration: Add VIP Employee Access Control Columns
-- Date: November 21, 2025
-- Description: Add columns to track VIP employee status
--              and access restrictions
-- =====================================================

-- Add VIP and restriction columns to hris.employee
ALTER TABLE hris.employee
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restriction_level VARCHAR(20) DEFAULT NULL 
  CHECK (restriction_level IN (NULL, 'none', 'financial', 'full', 'executive')),
ADD COLUMN IF NOT EXISTS restricted_by UUID REFERENCES hris.user_account(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS restriction_reason TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_vip_restricted 
ON hris.employee(organization_id, is_restricted, restriction_level) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_is_vip 
ON hris.employee(organization_id, is_vip) 
WHERE deleted_at IS NULL AND is_vip = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN hris.employee.is_vip IS 
  'Flag indicating VIP status (C-level executives, board members, high-value employees). ' ||
  'VIP employees may have access restrictions enabled.';

COMMENT ON COLUMN hris.employee.is_restricted IS 
  'Flag to enable access restrictions. When TRUE, only authorized users can access ' ||
  'this employee''s data based on access control rules.';

COMMENT ON COLUMN hris.employee.restriction_level IS 
  'Type of restriction: ' ||
  '- none: No restrictions (default) ' ||
  '- financial: Only compensation data restricted ' ||
  '- full: Compensation + performance + documents restricted ' ||
  '- executive: Maximum protection - all sensitive data restricted';

COMMENT ON COLUMN hris.employee.restricted_by IS 
  'User who marked this employee as restricted. NULL if not restricted.';

COMMENT ON COLUMN hris.employee.restricted_at IS 
  'Timestamp when restriction was enabled. NULL if not restricted.';

COMMENT ON COLUMN hris.employee.restriction_reason IS 
  'Business reason for restriction (audit trail). Example: ' ||
  '"C-level executive with highly sensitive compensation structure"';

-- Rollback script (DO NOT RUN IN PRODUCTION)
-- ALTER TABLE hris.employee 
-- DROP COLUMN IF EXISTS is_vip,
-- DROP COLUMN IF EXISTS is_restricted,
-- DROP COLUMN IF EXISTS restriction_level,
-- DROP COLUMN IF EXISTS restricted_by,
-- DROP COLUMN IF EXISTS restricted_at,
-- DROP COLUMN IF EXISTS restriction_reason;
```

### Updated hris.employee Schema

After migration, the employee table will have these additional columns:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `is_vip` | BOOLEAN | NOT NULL | FALSE | VIP status flag |
| `is_restricted` | BOOLEAN | NOT NULL | FALSE | Access restriction enabled |
| `restriction_level` | VARCHAR(20) | NULL | NULL | Type of restriction |
| `restricted_by` | UUID | NULL | NULL | User who enabled restriction |
| `restricted_at` | TIMESTAMPTZ | NULL | NULL | When restriction was enabled |
| `restriction_reason` | TEXT | NULL | NULL | Audit trail reason |

---

## 2. Employee Access Control Table

### Create hris.employee_access_control

**File:** `backend/src/database/migrations/20251121_create_employee_access_control.sql`

```sql
-- =====================================================
-- Migration: Create Employee Access Control Table
-- Date: November 21, 2025
-- Description: Defines who can access restricted employees
--              and what data types they can access
-- =====================================================

-- Create access control table
CREATE TABLE IF NOT EXISTS hris.employee_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Access Grants
  -- Store UUIDs of users, roles, or departments with access
  allowed_user_ids UUID[] DEFAULT '{}',
  allowed_role_ids UUID[] DEFAULT '{}',
  allowed_department_ids UUID[] DEFAULT '{}',
  
  -- Granular Data Type Restrictions
  -- When TRUE, the data type is RESTRICTED (requires authorization)
  -- When FALSE or NULL, the data type is accessible to authorized users
  restrict_compensation BOOLEAN DEFAULT TRUE,
  restrict_personal_info BOOLEAN DEFAULT FALSE,
  restrict_performance BOOLEAN DEFAULT FALSE,
  restrict_documents BOOLEAN DEFAULT FALSE,
  restrict_time_off BOOLEAN DEFAULT FALSE,
  restrict_benefits BOOLEAN DEFAULT FALSE,
  restrict_attendance BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES hris.user_account(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT uq_employee_access_control 
    UNIQUE (employee_id, organization_id)
);

-- Indexes for performance
CREATE INDEX idx_employee_access_control_org 
ON hris.employee_access_control(organization_id) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_employee_access_control_employee 
ON hris.employee_access_control(employee_id) 
WHERE deleted_at IS NULL;

-- GIN indexes for array searches (who has access to this employee?)
CREATE INDEX idx_employee_access_control_allowed_users 
ON hris.employee_access_control USING GIN(allowed_user_ids);

CREATE INDEX idx_employee_access_control_allowed_roles 
ON hris.employee_access_control USING GIN(allowed_role_ids);

CREATE INDEX idx_employee_access_control_allowed_departments 
ON hris.employee_access_control USING GIN(allowed_department_ids);

-- Table comment
COMMENT ON TABLE hris.employee_access_control IS 
  'Defines access control rules for restricted VIP employees. ' ||
  'Specifies which users, roles, or departments can access specific data types ' ||
  'for each restricted employee.';

-- Column comments
COMMENT ON COLUMN hris.employee_access_control.allowed_user_ids IS 
  'Array of user_account.id UUIDs who are explicitly granted access';

COMMENT ON COLUMN hris.employee_access_control.allowed_role_ids IS 
  'Array of role IDs that are granted access (e.g., HR Director role)';

COMMENT ON COLUMN hris.employee_access_control.allowed_department_ids IS 
  'Array of department.id UUIDs whose members are granted access';

COMMENT ON COLUMN hris.employee_access_control.restrict_compensation IS 
  'When TRUE, compensation data (salary, bonuses, equity) is restricted';

COMMENT ON COLUMN hris.employee_access_control.restrict_personal_info IS 
  'When TRUE, personal information (address, SSN, DOB) is restricted';

COMMENT ON COLUMN hris.employee_access_control.restrict_performance IS 
  'When TRUE, performance reviews and feedback are restricted';

COMMENT ON COLUMN hris.employee_access_control.restrict_documents IS 
  'When TRUE, employee documents (contracts, background checks) are restricted';

-- Rollback script (DO NOT RUN IN PRODUCTION)
-- DROP TABLE IF EXISTS hris.employee_access_control CASCADE;
```

### Access Control Table Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organization_id` | UUID | NOT NULL | - | Organization (tenant isolation) |
| `employee_id` | UUID | NOT NULL | - | Employee being protected |
| `allowed_user_ids` | UUID[] | NOT NULL | {} | Users with access |
| `allowed_role_ids` | UUID[] | NOT NULL | {} | Roles with access |
| `allowed_department_ids` | UUID[] | NOT NULL | {} | Departments with access |
| `restrict_compensation` | BOOLEAN | NOT NULL | TRUE | Restrict salary data |
| `restrict_personal_info` | BOOLEAN | NOT NULL | FALSE | Restrict PII |
| `restrict_performance` | BOOLEAN | NOT NULL | FALSE | Restrict reviews |
| `restrict_documents` | BOOLEAN | NOT NULL | FALSE | Restrict documents |
| `restrict_time_off` | BOOLEAN | NOT NULL | FALSE | Restrict PTO |
| `restrict_benefits` | BOOLEAN | NOT NULL | FALSE | Restrict benefits |
| `restrict_attendance` | BOOLEAN | NOT NULL | FALSE | Restrict attendance |

---

## 3. Restricted Access Audit Log

### Create hris.restricted_access_log

**File:** `backend/src/database/migrations/20251121_create_restricted_access_log.sql`

```sql
-- =====================================================
-- Migration: Create Restricted Access Audit Log
-- Date: November 21, 2025
-- Description: Audit trail for all access attempts
--              (both granted and denied) to restricted
--              VIP employee data
-- =====================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS hris.restricted_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
  
  -- Access Details
  access_type VARCHAR(50) NOT NULL 
    CHECK (access_type IN (
      'general', 'compensation', 'personal_info', 'performance', 
      'documents', 'time_off', 'benefits', 'attendance'
    )),
  access_granted BOOLEAN NOT NULL,
  denial_reason VARCHAR(200),
  
  -- Context Information
  endpoint VARCHAR(300),
  http_method VARCHAR(10),
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Partitioning hint: This table will grow large
  -- Consider partitioning by accessed_at (monthly) in production
  CONSTRAINT check_denial_reason 
    CHECK (
      (access_granted = TRUE AND denial_reason IS NULL) OR
      (access_granted = FALSE AND denial_reason IS NOT NULL)
    )
);

-- Indexes for common query patterns
CREATE INDEX idx_restricted_access_log_employee_time 
ON hris.restricted_access_log(employee_id, accessed_at DESC);

CREATE INDEX idx_restricted_access_log_user_time 
ON hris.restricted_access_log(user_id, accessed_at DESC);

CREATE INDEX idx_restricted_access_log_org_time 
ON hris.restricted_access_log(organization_id, accessed_at DESC);

CREATE INDEX idx_restricted_access_log_granted 
ON hris.restricted_access_log(access_granted, accessed_at DESC)
WHERE access_granted = FALSE; -- Index only denied attempts

CREATE INDEX idx_restricted_access_log_access_type 
ON hris.restricted_access_log(access_type, accessed_at DESC);

-- Table comment
COMMENT ON TABLE hris.restricted_access_log IS 
  'Audit trail for all access attempts to restricted VIP employee data. ' ||
  'Logs both granted and denied access for compliance and security monitoring. ' ||
  'Consider partitioning by accessed_at for large datasets.';

-- Column comments
COMMENT ON COLUMN hris.restricted_access_log.access_type IS 
  'Type of data accessed: general (profile), compensation, personal_info, ' ||
  'performance, documents, time_off, benefits, attendance';

COMMENT ON COLUMN hris.restricted_access_log.access_granted IS 
  'TRUE if access was granted, FALSE if denied';

COMMENT ON COLUMN hris.restricted_access_log.denial_reason IS 
  'Reason for denial: "User not authorized", "Role not allowed", etc. ' ||
  'NULL if access was granted.';

COMMENT ON COLUMN hris.restricted_access_log.endpoint IS 
  'API endpoint accessed: /api/products/nexus/employees/:id/compensation';

-- Data retention policy (optional)
-- Create a cleanup function for old logs (keep 7 years for compliance)
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hris.restricted_access_log
  WHERE accessed_at < NOW() - INTERVAL '7 years';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_access_logs() IS 
  'Deletes access logs older than 7 years for compliance. ' ||
  'Run monthly via cron job or pg_cron.';

-- Rollback script (DO NOT RUN IN PRODUCTION)
-- DROP FUNCTION IF EXISTS cleanup_old_access_logs();
-- DROP TABLE IF EXISTS hris.restricted_access_log CASCADE;
```

### Audit Log Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organization_id` | UUID | NOT NULL | - | Organization (tenant isolation) |
| `employee_id` | UUID | NOT NULL | - | Employee accessed |
| `user_id` | UUID | NOT NULL | - | User who attempted access |
| `access_type` | VARCHAR(50) | NOT NULL | - | Type of data accessed |
| `access_granted` | BOOLEAN | NOT NULL | - | Access result |
| `denial_reason` | VARCHAR(200) | NULL | - | Why denied (if denied) |
| `endpoint` | VARCHAR(300) | NULL | - | API endpoint |
| `http_method` | VARCHAR(10) | NULL | - | GET, POST, etc. |
| `ip_address` | INET | NULL | - | Request IP |
| `user_agent` | TEXT | NULL | - | Browser/client |
| `accessed_at` | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp |

---

## 4. Migration Execution Order

### Recommended Execution Sequence

```bash
# 1. Add VIP columns to employee table
psql -d recruitiq -f backend/src/database/migrations/20251121_add_vip_employee_columns.sql

# 2. Create access control table
psql -d recruitiq -f backend/src/database/migrations/20251121_create_employee_access_control.sql

# 3. Create audit log table
psql -d recruitiq -f backend/src/database/migrations/20251121_create_restricted_access_log.sql

# 4. Verify migrations
psql -d recruitiq -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'hris' AND table_name = 'employee' AND column_name LIKE '%vip%' OR column_name LIKE '%restrict%';"

psql -d recruitiq -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'hris' AND table_name IN ('employee_access_control', 'restricted_access_log');"
```

### Migration Verification Queries

```sql
-- Verify employee table columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'hris' 
  AND table_name = 'employee'
  AND column_name IN ('is_vip', 'is_restricted', 'restriction_level', 'restricted_by', 'restricted_at', 'restriction_reason')
ORDER BY ordinal_position;

-- Verify access control table
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'hris' 
  AND table_name = 'employee_access_control'
ORDER BY ordinal_position;

-- Verify audit log table
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'hris' 
  AND table_name = 'restricted_access_log'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'hris'
  AND (
    tablename = 'employee' AND indexname LIKE '%vip%' OR
    tablename IN ('employee_access_control', 'restricted_access_log')
  )
ORDER BY tablename, indexname;
```

---

## 5. Data Seeding (Optional)

### Sample VIP Employee Data

For development/testing environments, you can seed sample VIP employees:

**File:** `backend/src/database/seeds/vip_employees_sample_data.sql`

```sql
-- =====================================================
-- Sample Data: VIP Employee Access Control
-- Environment: Development/Testing ONLY
-- DO NOT RUN IN PRODUCTION
-- =====================================================

-- Assumes you have test employees and users already created

-- Mark CEO as VIP with executive-level restriction
UPDATE hris.employee
SET 
  is_vip = TRUE,
  is_restricted = TRUE,
  restriction_level = 'executive',
  restricted_at = NOW(),
  restriction_reason = 'CEO - Maximum protection for all sensitive data'
WHERE job_title = 'Chief Executive Officer'
  AND organization_id = (SELECT id FROM organizations LIMIT 1)
  AND deleted_at IS NULL;

-- Mark CFO as VIP with financial restriction
UPDATE hris.employee
SET 
  is_vip = TRUE,
  is_restricted = TRUE,
  restriction_level = 'financial',
  restricted_at = NOW(),
  restriction_reason = 'CFO - Compensation data restricted to senior leadership'
WHERE job_title ILIKE '%CFO%' OR job_title ILIKE '%Chief Financial Officer%'
  AND organization_id = (SELECT id FROM organizations LIMIT 1)
  AND deleted_at IS NULL;

-- Create access control rules for CEO
-- Only HR Director and Owner can access
INSERT INTO hris.employee_access_control (
  organization_id,
  employee_id,
  allowed_user_ids,
  allowed_role_ids,
  restrict_compensation,
  restrict_personal_info,
  restrict_performance,
  restrict_documents,
  created_by
)
SELECT 
  e.organization_id,
  e.id,
  ARRAY[
    (SELECT id FROM hris.user_account WHERE email = 'hr.director@company.com' AND organization_id = e.organization_id LIMIT 1),
    (SELECT id FROM hris.user_account WHERE email = 'owner@company.com' AND organization_id = e.organization_id LIMIT 1)
  ],
  ARRAY[]::UUID[],
  TRUE,  -- restrict_compensation
  TRUE,  -- restrict_personal_info
  TRUE,  -- restrict_performance
  TRUE,  -- restrict_documents
  (SELECT id FROM hris.user_account WHERE email = 'hr.director@company.com' AND organization_id = e.organization_id LIMIT 1)
FROM hris.employee e
WHERE e.job_title = 'Chief Executive Officer'
  AND e.is_restricted = TRUE
  AND e.deleted_at IS NULL
ON CONFLICT (employee_id, organization_id) DO NOTHING;

-- Sample audit log entry (for testing UI)
INSERT INTO hris.restricted_access_log (
  organization_id,
  employee_id,
  user_id,
  access_type,
  access_granted,
  denial_reason,
  endpoint,
  http_method,
  ip_address,
  accessed_at
)
SELECT 
  e.organization_id,
  e.id,
  (SELECT id FROM hris.user_account WHERE email = 'hr.manager@company.com' AND organization_id = e.organization_id LIMIT 1),
  'compensation',
  FALSE,
  'User not in authorized list',
  '/api/products/nexus/employees/' || e.id || '/compensation',
  'GET',
  '192.168.1.100'::INET,
  NOW() - INTERVAL '2 hours'
FROM hris.employee e
WHERE e.is_restricted = TRUE
  AND e.deleted_at IS NULL
LIMIT 1;
```

---

## 6. Index Strategy & Performance

### Query Performance Considerations

**Expected Query Patterns:**

1. **Check if employee is restricted** (high frequency)
   ```sql
   SELECT is_restricted, restriction_level 
   FROM hris.employee 
   WHERE id = $1 AND organization_id = $2;
   ```
   - Uses primary key index (already exists)
   - ~0.1ms execution time

2. **Get access control rules** (high frequency)
   ```sql
   SELECT * FROM hris.employee_access_control
   WHERE employee_id = $1 AND organization_id = $2;
   ```
   - Uses `idx_employee_access_control_employee`
   - ~0.2ms execution time

3. **Check if user has access** (high frequency)
   ```sql
   SELECT * FROM hris.employee_access_control
   WHERE employee_id = $1 
     AND (
       $2 = ANY(allowed_user_ids) OR
       $3 = ANY(allowed_role_ids)
     );
   ```
   - Uses GIN indexes on arrays
   - ~0.5ms execution time

4. **List VIP employees** (medium frequency)
   ```sql
   SELECT * FROM hris.employee
   WHERE organization_id = $1 
     AND is_vip = TRUE 
     AND deleted_at IS NULL;
   ```
   - Uses `idx_employee_is_vip`
   - ~1-5ms depending on result size

5. **Audit log queries** (low frequency, read-heavy)
   ```sql
   SELECT * FROM hris.restricted_access_log
   WHERE employee_id = $1
   ORDER BY accessed_at DESC
   LIMIT 50;
   ```
   - Uses `idx_restricted_access_log_employee_time`
   - ~2-10ms depending on log size

### Index Maintenance

```sql
-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'hris'
  AND (
    tablename IN ('employee_access_control', 'restricted_access_log') OR
    indexname LIKE '%vip%'
  )
ORDER BY idx_scan DESC;

-- Monitor table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'hris'
  AND tablename IN ('employee', 'employee_access_control', 'restricted_access_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Reindex if needed (low priority maintenance)
REINDEX TABLE hris.employee_access_control;
REINDEX TABLE hris.restricted_access_log;
```

---

## 7. Backup & Rollback Strategy

### Pre-Migration Backup

```bash
# Full database backup before migration
pg_dump -h localhost -U postgres -d recruitiq -F c -f recruitiq_backup_pre_vip_migration_$(date +%Y%m%d).dump

# Table-specific backup
pg_dump -h localhost -U postgres -d recruitiq -t hris.employee -F c -f employee_backup_$(date +%Y%m%d).dump
```

### Rollback Plan

If migration fails or needs to be reverted:

```sql
-- Step 1: Drop new tables (no data loss)
DROP TABLE IF EXISTS hris.restricted_access_log CASCADE;
DROP TABLE IF EXISTS hris.employee_access_control CASCADE;

-- Step 2: Remove columns from employee table
ALTER TABLE hris.employee
DROP COLUMN IF EXISTS is_vip,
DROP COLUMN IF EXISTS is_restricted,
DROP COLUMN IF EXISTS restriction_level,
DROP COLUMN IF EXISTS restricted_by,
DROP COLUMN IF EXISTS restricted_at,
DROP COLUMN IF EXISTS restriction_reason;

-- Step 3: Verify rollback
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'hris' 
  AND table_name = 'employee'
  AND column_name LIKE '%vip%' OR column_name LIKE '%restrict%';
-- Should return 0 rows
```

### Data Validation Post-Migration

```sql
-- Ensure no data corruption
SELECT COUNT(*) as total_employees,
       COUNT(*) FILTER (WHERE is_vip IS NULL) as null_vip_flag,
       COUNT(*) FILTER (WHERE is_restricted IS NULL) as null_restricted_flag
FROM hris.employee
WHERE deleted_at IS NULL;
-- All counts should be 0 for null flags

-- Verify foreign key integrity
SELECT COUNT(*) FROM hris.employee_access_control eac
LEFT JOIN hris.employee e ON eac.employee_id = e.id
WHERE e.id IS NULL;
-- Should return 0

-- Verify unique constraint
SELECT employee_id, organization_id, COUNT(*) 
FROM hris.employee_access_control
GROUP BY employee_id, organization_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## Summary

### Files Created: 3

1. `20251121_add_vip_employee_columns.sql` - Employee table modifications
2. `20251121_create_employee_access_control.sql` - Access control table
3. `20251121_create_restricted_access_log.sql` - Audit log table

### Database Objects Created: 16

- **Columns Added:** 6 (to hris.employee)
- **Tables Created:** 2 (employee_access_control, restricted_access_log)
- **Indexes Created:** 8
- **Functions Created:** 1 (cleanup_old_access_logs)
- **Constraints Created:** 4 (CHECK, UNIQUE, FK)

### Estimated Storage Impact

For an organization with 1,000 employees:
- **VIP Employees:** ~10-20 (2%)
- **Access Control Records:** ~20 rows × 1KB = 20KB
- **Audit Log:** ~1,000 entries/month × 500 bytes = 500KB/month
- **Total First Year:** ~6.5MB additional storage (negligible)

### Performance Impact

- ✅ **Minimal:** All queries use indexed columns
- ✅ **No impact** on non-VIP employee queries
- ✅ **< 1ms overhead** for VIP employee access checks
- ✅ **Background cleanup** prevents unbounded log growth

---

**Status:** Ready for Review  
**Next Steps:** Code review → Test in dev environment → Apply to staging  
**Next Document:** [Part 3: Backend Implementation](./03-BACKEND-IMPLEMENTATION.md)
