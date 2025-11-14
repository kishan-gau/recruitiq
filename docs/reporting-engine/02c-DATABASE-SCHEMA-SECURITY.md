# Database Schema Part 3 - Security & Maintenance

**Document:** 02c-DATABASE-SCHEMA-SECURITY.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Continuation of:** 02b-DATABASE-SCHEMA-OPERATIONAL.md

---

## 7. Security Functions - Organization Filtering

These PostgreSQL functions provide **row-level security** enforcement at the database level.

### Get User's Accessible Organizations

```sql
CREATE OR REPLACE FUNCTION security.get_user_accessible_orgs(
  p_user_id UUID
)
RETURNS TABLE(organization_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH user_groups AS (
    -- Get all groups user has access to
    SELECT UNNEST(accessible_groups) AS group_id
    FROM security.reporting_users
    WHERE id = p_user_id
      AND is_active = true
      AND deleted_at IS NULL
  ),
  group_orgs AS (
    -- Get all organizations in those groups
    SELECT DISTINCT om.organization_id
    FROM security.organization_memberships om
    JOIN user_groups ug ON ug.group_id = om.group_id
    WHERE (om.effective_to IS NULL OR om.effective_to >= CURRENT_DATE)
  ),
  direct_orgs AS (
    -- Get directly assigned organizations
    SELECT UNNEST(accessible_organizations) AS organization_id
    FROM security.reporting_users
    WHERE id = p_user_id
  )
  -- Combine both sources
  SELECT organization_id FROM group_orgs
  UNION
  SELECT organization_id FROM direct_orgs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION security.get_user_accessible_orgs IS 
  'Returns all organization IDs a user can access based on group membership and direct assignments';
```

### Check User Organization Access

```sql
CREATE OR REPLACE FUNCTION security.user_can_access_org(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM security.get_user_accessible_orgs(p_user_id) 
    WHERE organization_id = p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION security.user_can_access_org IS 
  'Check if a user has access to a specific organization';
```

### Get User's Data Visibility Level

```sql
CREATE OR REPLACE FUNCTION security.get_user_visibility_level(
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_level TEXT;
BEGIN
  SELECT permissions->>'dataVisibility'->>'level'
  INTO v_level
  FROM security.reporting_users
  WHERE id = p_user_id
    AND is_active = true
    AND deleted_at IS NULL;
  
  RETURN COALESCE(v_level, 'aggregate_only');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Apply Data Masking

```sql
CREATE OR REPLACE FUNCTION security.mask_salary(
  p_user_id UUID,
  p_salary DECIMAL(15,2)
)
RETURNS TEXT AS $$
DECLARE
  v_masking_rule TEXT;
  v_can_view_salary BOOLEAN;
BEGIN
  -- Check if user has salary viewing permission
  SELECT (permissions->'hr'->>'viewSalaries')::BOOLEAN
  INTO v_can_view_salary
  FROM security.reporting_users
  WHERE id = p_user_id;
  
  IF NOT v_can_view_salary THEN
    RETURN 'RESTRICTED';
  END IF;
  
  -- Get masking rule
  SELECT data_masking_rules->>'salary'
  INTO v_masking_rule
  FROM security.reporting_users
  WHERE id = p_user_id;
  
  CASE v_masking_rule
    WHEN 'range' THEN
      -- Return salary range instead of exact amount
      RETURN CASE 
        WHEN p_salary < 30000 THEN '< $30K'
        WHEN p_salary BETWEEN 30000 AND 49999 THEN '$30K-$50K'
        WHEN p_salary BETWEEN 50000 AND 74999 THEN '$50K-$75K'
        WHEN p_salary BETWEEN 75000 AND 99999 THEN '$75K-$100K'
        WHEN p_salary BETWEEN 100000 AND 149999 THEN '$100K-$150K'
        ELSE '$150K+'
      END;
    WHEN 'hide' THEN
      RETURN 'HIDDEN';
    ELSE
      -- No masking - return exact value
      RETURN '$' || TO_CHAR(p_salary, 'FM999,999,999.00');
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION security.mask_salary IS 
  'Apply salary masking based on user permissions and masking rules';
```

### Mask Personal Information

```sql
CREATE OR REPLACE FUNCTION security.mask_ssn(
  p_user_id UUID,
  p_ssn_hash TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_masking_rule TEXT;
BEGIN
  SELECT data_masking_rules->>'ssn'
  INTO v_masking_rule
  FROM security.reporting_users
  WHERE id = p_user_id;
  
  CASE v_masking_rule
    WHEN 'full' THEN
      -- Show only last 4 digits
      RETURN 'XXX-XX-' || RIGHT(p_ssn_hash, 4);
    WHEN 'hide' THEN
      RETURN 'HIDDEN';
    ELSE
      RETURN 'XXX-XX-XXXX'; -- Default masking
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 8. Audit Triggers

Automatically log security events and suspicious activities.

### Failed Login Tracking

```sql
CREATE OR REPLACE FUNCTION audit.log_failed_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment failed login counter
  UPDATE security.reporting_users
  SET 
    failed_login_attempts = failed_login_attempts + 1,
    account_locked = CASE 
      WHEN failed_login_attempts + 1 >= 5 THEN true 
      ELSE account_locked 
    END,
    locked_until = CASE 
      WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
      ELSE locked_until
    END
  WHERE id = NEW.user_id;
  
  -- Create security alert if threshold exceeded
  IF NEW.failed_login_attempts >= 3 THEN
    INSERT INTO audit.security_alerts (
      alert_type, severity, user_id, user_email,
      title, description, details
    )
    SELECT 
      'excessive_failed_logins',
      CASE 
        WHEN NEW.failed_login_attempts >= 5 THEN 'high'
        ELSE 'medium'
      END,
      NEW.user_id,
      ru.email,
      'Multiple Failed Login Attempts',
      'User has ' || NEW.failed_login_attempts || ' failed login attempts',
      jsonb_build_object(
        'attempts', NEW.failed_login_attempts,
        'ip_address', NEW.last_login_ip,
        'timestamp', NOW()
      )
    FROM security.reporting_users ru
    WHERE ru.id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger creation would be on login event table
```

### Suspicious Access Pattern Detection

```sql
CREATE OR REPLACE FUNCTION audit.detect_suspicious_access()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_accesses INTEGER;
  v_org_count INTEGER;
  v_user_role TEXT;
BEGIN
  -- Count recent accesses (last 5 minutes)
  SELECT COUNT(*)
  INTO v_recent_accesses
  FROM audit.access_audit_log
  WHERE user_id = NEW.user_id
    AND accessed_at > NOW() - INTERVAL '5 minutes';
  
  -- Alert if excessive requests
  IF v_recent_accesses > 50 THEN
    NEW.is_suspicious := true;
    NEW.alert_reason := 'Excessive requests: ' || v_recent_accesses || ' in 5 minutes';
    
    INSERT INTO audit.security_alerts (
      alert_type, severity, user_id, user_email,
      title, description, related_audit_log_ids
    ) VALUES (
      'excessive_access',
      'high',
      NEW.user_id,
      NEW.user_email,
      'Excessive API Requests',
      NEW.user_email || ' made ' || v_recent_accesses || ' requests in 5 minutes',
      ARRAY[NEW.id]
    );
  END IF;
  
  -- Check if user is accessing too many organizations
  SELECT role INTO v_user_role
  FROM security.reporting_users
  WHERE id = NEW.user_id;
  
  SELECT COUNT(DISTINCT organization_id)
  INTO v_org_count
  FROM (
    SELECT UNNEST(organization_ids) AS organization_id
    FROM audit.access_audit_log
    WHERE user_id = NEW.user_id
      AND accessed_at > NOW() - INTERVAL '1 hour'
  ) orgs;
  
  -- Alert if accessing many orgs (unless super admin)
  IF v_org_count > 10 AND v_user_role != 'super_admin' THEN
    NEW.is_suspicious := true;
    NEW.alert_reason := COALESCE(NEW.alert_reason || '; ', '') || 
                        'Accessing multiple organizations: ' || v_org_count;
    
    INSERT INTO audit.security_alerts (
      alert_type, severity, user_id, user_email,
      title, description
    ) VALUES (
      'broad_org_access',
      'medium',
      NEW.user_id,
      NEW.user_email,
      'Accessing Multiple Organizations',
      NEW.user_email || ' accessed ' || v_org_count || ' organizations in 1 hour'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_suspicious_access
  BEFORE INSERT ON audit.access_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit.detect_suspicious_access();
```

---

## 9. Materialized View Refresh Functions

### Refresh All Reporting Views

```sql
CREATE OR REPLACE FUNCTION reporting.refresh_all_views()
RETURNS TABLE(
  view_name TEXT,
  rows_affected BIGINT,
  refresh_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_view_record RECORD;
BEGIN
  -- Log start of refresh job
  INSERT INTO etl.job_runs (job_name, job_type, status, source_db, target_schema)
  VALUES ('refresh_all_materialized_views', 'full_sync', 'running', 'operational', 'reporting');
  
  -- Refresh each materialized view
  FOR v_view_record IN 
    SELECT schemaname || '.' || matviewname AS full_name
    FROM pg_matviews
    WHERE schemaname = 'reporting'
    ORDER BY matviewname
  LOOP
    v_start_time := clock_timestamp();
    
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || v_view_record.full_name;
    
    -- Return refresh statistics
    RETURN QUERY
    SELECT 
      v_view_record.full_name,
      (SELECT COUNT(*) FROM v_view_record.full_name)::BIGINT,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  END LOOP;
  
  -- Update job status
  UPDATE etl.job_runs
  SET status = 'completed', completed_at = NOW()
  WHERE job_name = 'refresh_all_materialized_views'
    AND status = 'running'
    AND started_at = (
      SELECT MAX(started_at)
      FROM etl.job_runs
      WHERE job_name = 'refresh_all_materialized_views'
    );
    
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reporting.refresh_all_views IS 
  'Refresh all materialized views in reporting schema. Run during nightly ETL.';
```

### Refresh Single View

```sql
CREATE OR REPLACE FUNCTION reporting.refresh_view(
  p_view_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  -- Construct full view name
  v_full_name := 'reporting.' || p_view_name;
  
  -- Verify view exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'reporting' AND matviewname = p_view_name
  ) THEN
    RAISE EXCEPTION 'Materialized view % does not exist', v_full_name;
  END IF;
  
  -- Refresh with concurrency to avoid locking
  EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || v_full_name;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error refreshing view %: %', v_full_name, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Database Users & Permissions

### Read-Only Reporting User

```sql
-- Create read-only user for ETL/Sync operations
CREATE USER reporting_reader WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';

-- Grant connection
GRANT CONNECT ON DATABASE recruitiq_reporting TO reporting_reader;

-- Grant schema usage
GRANT USAGE ON SCHEMA operational, reporting, security, audit TO reporting_reader;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA operational TO reporting_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO reporting_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA security TO reporting_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO reporting_reader;

-- Grant SELECT on future tables (auto-grant)
ALTER DEFAULT PRIVILEGES IN SCHEMA operational GRANT SELECT ON TABLES TO reporting_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting GRANT SELECT ON TABLES TO reporting_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA security GRANT SELECT ON TABLES TO reporting_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO reporting_reader;

-- Grant EXECUTE on security functions (needed for filtering)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA security TO reporting_reader;

COMMENT ON ROLE reporting_reader IS 
  'Read-only user for reporting queries. Used by backend API and Metabase.';
```

### ETL Writer User

```sql
-- Create user for ETL processes (can write to operational schema)
CREATE USER etl_writer WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';

GRANT CONNECT ON DATABASE recruitiq_reporting TO etl_writer;
GRANT USAGE ON SCHEMA operational, reporting, etl TO etl_writer;

-- Write permissions for operational schema (for data sync)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA operational TO etl_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA operational 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO etl_writer;

-- Write permissions for ETL tracking
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA etl TO etl_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO etl_writer;

-- Execute permissions for refresh functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA reporting TO etl_writer;

COMMENT ON ROLE etl_writer IS 
  'ETL process user. Can write to operational and etl schemas for data synchronization.';
```

### Audit Logger User

```sql
-- Create user for audit logging from backend
CREATE USER audit_logger WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';

GRANT CONNECT ON DATABASE recruitiq_reporting TO audit_logger;
GRANT USAGE ON SCHEMA audit, security TO audit_logger;

-- Write permissions for audit logs
GRANT INSERT ON audit.access_audit_log TO audit_logger;
GRANT INSERT, UPDATE ON audit.security_alerts TO audit_logger;

-- Read permissions for user session validation
GRANT SELECT ON security.reporting_users TO audit_logger;
GRANT SELECT ON security.user_sessions TO audit_logger;

COMMENT ON ROLE audit_logger IS 
  'User for logging access and security events from backend API.';
```

---

## 11. Performance Optimizations

### Connection Pooling Configuration

```sql
-- Recommended postgresql.conf settings for reporting database

-- Connection settings
max_connections = 100
shared_buffers = 4GB           -- 25% of available RAM
effective_cache_size = 12GB     -- 75% of available RAM
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

-- Query optimization
random_page_cost = 1.1          -- For SSD storage
effective_io_concurrency = 200  -- For SSD storage
work_mem = 16MB                 -- Per query operation
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

-- Logging (for query analysis)
log_min_duration_statement = 500  -- Log slow queries (>500ms)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

### Auto-Vacuum Configuration

```sql
-- Aggressive auto-vacuum for reporting tables
ALTER TABLE audit.access_audit_log SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE operational.employees SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

### Index Maintenance Function

```sql
CREATE OR REPLACE FUNCTION reporting.reindex_all()
RETURNS void AS $$
DECLARE
  v_index RECORD;
BEGIN
  FOR v_index IN 
    SELECT schemaname, tablename, indexname
    FROM pg_indexes
    WHERE schemaname IN ('operational', 'reporting', 'security', 'audit')
  LOOP
    EXECUTE 'REINDEX INDEX CONCURRENTLY ' || 
            quote_ident(v_index.schemaname) || '.' || 
            quote_ident(v_index.indexname);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reporting.reindex_all IS 
  'Rebuild all indexes. Run monthly during maintenance window.';
```

---

## 12. Database Backup Strategy

### Backup Script (to be run via cron)

```bash
#!/bin/bash
# backup-reporting-db.sh

BACKUP_DIR="/var/backups/reporting-db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="recruitiq_reporting"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -h localhost -U postgres -F c -b -v \
  -f "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.backup" \
  $DB_NAME

# Backup schemas separately for easier restore
pg_dump -h localhost -U postgres -n security -F p \
  -f "$BACKUP_DIR/${DB_NAME}_security_${TIMESTAMP}.sql" \
  $DB_NAME

pg_dump -h localhost -U postgres -n audit -F p \
  -f "$BACKUP_DIR/${DB_NAME}_audit_${TIMESTAMP}.sql" \
  $DB_NAME

# Compress backups
gzip "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.backup"
gzip "$BACKUP_DIR/${DB_NAME}_security_${TIMESTAMP}.sql"
gzip "$BACKUP_DIR/${DB_NAME}_audit_${TIMESTAMP}.sql"

# Delete backups older than retention period
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: ${TIMESTAMP}"
```

### Restore Script

```bash
#!/bin/bash
# restore-reporting-db.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.backup.gz>"
  exit 1
fi

# Extract backup
gunzip -k $BACKUP_FILE

# Restore
pg_restore -h localhost -U postgres -d recruitiq_reporting \
  -c -v "${BACKUP_FILE%.gz}"

echo "Restore completed"
```

---

## 13. Monitoring Queries

### Check Materialized View Freshness

```sql
SELECT 
  schemaname,
  matviewname,
  last_refresh,
  NOW() - last_refresh AS staleness,
  CASE 
    WHEN NOW() - last_refresh > INTERVAL '25 hours' THEN 'STALE'
    ELSE 'FRESH'
  END AS status
FROM pg_stat_user_tables
WHERE schemaname = 'reporting'
ORDER BY last_refresh DESC;
```

### Check Database Size

```sql
SELECT 
  pg_database.datname AS database_name,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'recruitiq_reporting';
```

### Check Table Sizes

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                 pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname IN ('operational', 'reporting', 'security', 'audit')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

### Check Slow Queries

```sql
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 14. Initial Data Setup

### Seed Script

```sql
-- Run after schema creation

BEGIN;

-- Create default super admin user
INSERT INTO security.reporting_users (
  email, username, first_name, last_name,
  password_hash, role,
  accessible_groups, accessible_organizations,
  permissions
) VALUES (
  'admin@recruitiq.com',
  'superadmin',
  'System',
  'Administrator',
  '$2b$10$EXAMPLE_HASH_REPLACE_IN_PRODUCTION', -- bcrypt hash
  'super_admin',
  '{}', -- Empty array (super admin has implicit access to all)
  '{}',
  '{
    "hr": {"viewEmployees": true, "viewDetails": true, "viewSalaries": true, "exportData": true},
    "payroll": {"viewReports": true, "viewIndividual": true, "viewAggregates": true, "exportData": true},
    "scheduling": {"viewSchedules": true},
    "dataVisibility": {"level": "full_detail"}
  }'::jsonb
);

-- Create example organization groups (adjust to your needs)
INSERT INTO security.organization_groups (name, code, description, level, path) VALUES
  ('All Companies', 'ALL', 'Top-level group containing all subsidiaries', 1, '/all'),
  ('North America', 'NA', 'North American operations', 2, '/all/na'),
  ('Europe', 'EU', 'European operations', 2, '/all/eu'),
  ('Asia Pacific', 'APAC', 'Asia Pacific operations', 2, '/all/apac');

COMMIT;
```

---

## Summary

### Database Objects Created

| Category | Count | Examples |
|----------|-------|----------|
| Schemas | 5 | operational, reporting, security, audit, etl |
| Tables | 15+ | organizations, employees, payroll_runs, reporting_users, access_audit_log |
| Materialized Views | 5 | employee_details, payroll_summary, headcount_trends, turnover_metrics, group_consolidated_summary |
| Functions | 10+ | get_user_accessible_orgs, mask_salary, refresh_all_views |
| Indexes | 50+ | Optimized for common query patterns |
| Users | 3 | reporting_reader, etl_writer, audit_logger |

### Key Features

✅ **Multi-Tenant Isolation** - Organization filtering at database level  
✅ **Role-Based Access** - 6 role levels with granular permissions  
✅ **Data Masking** - Salary ranges, SSN masking, PII protection  
✅ **Audit Logging** - Complete access trail with suspicious activity detection  
✅ **Performance Optimized** - Materialized views, strategic indexes  
✅ **ETL Ready** - Sync tracking, job logging, error handling  
✅ **Security First** - Read-only users, principle of least privilege  

### Next Steps

1. **Deploy Schema** - Run SQL scripts in order (01, 02a, 02b, 02c)
2. **Create Users** - Set strong passwords for database users
3. **Seed Data** - Run initial data setup script
4. **Test Security** - Verify organization filtering functions
5. **Configure Backups** - Set up automated backup cron jobs

---

**Status:** ✅ Database Schema Complete  
**Next Document:** 03-AUTHENTICATION-SYSTEM.md
