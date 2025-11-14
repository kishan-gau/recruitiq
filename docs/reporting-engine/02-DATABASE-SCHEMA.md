# Database Schema - Reporting Engine

**Document:** 02-DATABASE-SCHEMA.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  

---

## Overview

The reporting database is a **separate PostgreSQL instance** optimized for analytics workloads (OLAP). It contains replicated operational data, denormalized views, and reporting-specific tables.

### Design Principles

1. **Denormalized for Performance** - Pre-join tables for fast queries
2. **Historical Tracking** - Keep snapshots for trend analysis
3. **Read-Optimized** - Indexes for common reporting queries
4. **Security First** - Built-in organization filtering
5. **Audit Complete** - Log all data access

---

## Database Creation

```sql
-- Create reporting database
CREATE DATABASE recruitiq_reporting
  WITH ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;

\c recruitiq_reporting;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Text search optimization
```

---

## Schema Structure

```sql
-- Create schemas for logical separation
CREATE SCHEMA IF NOT EXISTS operational;   -- Replicated operational data
CREATE SCHEMA IF NOT EXISTS reporting;     -- Reporting-specific tables & views
CREATE SCHEMA IF NOT EXISTS security;      -- Authentication & authorization
CREATE SCHEMA IF NOT EXISTS audit;         -- Access logging
CREATE SCHEMA IF NOT EXISTS etl;           -- ETL metadata & control
```

---

## 1. Security Schema - Organization Groups

### Organization Groups Table

```sql
CREATE TABLE security.organization_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Group identification
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  
  -- Hierarchy support
  parent_group_id UUID REFERENCES security.organization_groups(id),
  level INTEGER NOT NULL DEFAULT 1, -- 1=top level, 2=sub-group, etc.
  path TEXT, -- Materialized path: /parent/child/grandchild
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT check_no_self_parent CHECK (id != parent_group_id),
  CONSTRAINT check_positive_level CHECK (level > 0)
);

CREATE INDEX idx_org_groups_parent ON security.organization_groups(parent_group_id) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_org_groups_path ON security.organization_groups USING gin(path gin_trgm_ops);
CREATE INDEX idx_org_groups_active ON security.organization_groups(is_active) 
  WHERE deleted_at IS NULL;

COMMENT ON TABLE security.organization_groups IS 
  'Hierarchical groups for organizing multiple organizations (e.g., Retail Division, Manufacturing Division)';

-- Example data
INSERT INTO security.organization_groups (name, code, description, level, path) VALUES
  ('Retail Division', 'RET', 'All retail subsidiary companies', 1, '/retail'),
  ('Manufacturing Division', 'MFG', 'All manufacturing subsidiary companies', 1, '/manufacturing'),
  ('Services Division', 'SVC', 'All service subsidiary companies', 1, '/services');
```

### Organization Memberships Table

```sql
CREATE TABLE security.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  organization_id UUID NOT NULL, -- References operational organizations table
  group_id UUID NOT NULL REFERENCES security.organization_groups(id) ON DELETE CASCADE,
  
  -- Membership details
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'subsidiary' 
    CHECK (relationship_type IN ('subsidiary', 'division', 'branch', 'franchise', 'joint_venture')),
  ownership_percentage DECIMAL(5,2), -- NULL means not applicable, 0-100
  
  -- Effective dates
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  
  -- Constraints
  CONSTRAINT unique_org_group_membership UNIQUE (organization_id, group_id),
  CONSTRAINT check_valid_percentage CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  CONSTRAINT check_valid_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_org_memberships_org ON security.organization_memberships(organization_id);
CREATE INDEX idx_org_memberships_group ON security.organization_memberships(group_id);
CREATE INDEX idx_org_memberships_dates ON security.organization_memberships(effective_from, effective_to);

COMMENT ON TABLE security.organization_memberships IS 
  'Links organizations to groups for consolidated reporting. Supports temporal membership (effective dates).';
```

---

## 2. Security Schema - Reporting Users

### Reporting Users Table

```sql
CREATE TABLE security.reporting_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identification
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255),
  
  -- Authentication
  password_hash VARCHAR(500) NOT NULL,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT false,
  
  -- Access control
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' 
    CHECK (role IN ('super_admin', 'group_executive', 'dept_head_hr', 'dept_head_finance', 
                    'org_manager', 'dept_manager', 'auditor', 'viewer')),
  
  -- Group/Organization access (arrays for flexibility)
  accessible_groups UUID[] NOT NULL DEFAULT '{}', -- Array of group IDs
  accessible_organizations UUID[] NOT NULL DEFAULT '{}', -- Direct org access (without group)
  
  -- Module permissions (JSON for flexibility)
  permissions JSONB NOT NULL DEFAULT '{}',
  /* Example permissions structure:
  {
    "hr": {
      "viewEmployees": true,
      "viewDetails": true,
      "viewSalaries": false,
      "exportData": true
    },
    "payroll": {
      "viewReports": true,
      "viewIndividual": false,
      "viewAggregates": true,
      "exportData": false
    },
    "scheduling": {
      "viewSchedules": true
    },
    "dataVisibility": {
      "level": "aggregate_only",  // or "full_detail", "masked_detail"
      "departments": ["all"],
      "locations": ["all"]
    }
  }
  */
  
  -- Data masking rules (JSON)
  data_masking_rules JSONB DEFAULT '{}',
  /* Example:
  {
    "salary": "range",      // Show range instead of exact amount
    "ssn": "mask",          // Show XXX-XX-1234
    "email": "domain_only", // Show *****@company.com
    "phone": "partial"      // Show (555) XXX-1234
  }
  */
  
  -- Security
  is_active BOOLEAN DEFAULT true,
  account_locked BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  last_activity_at TIMESTAMPTZ,
  
  -- MFA (Multi-Factor Authentication)
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  mfa_backup_codes JSONB, -- Encrypted array of backup codes
  mfa_backup_codes_used INTEGER DEFAULT 0,
  mfa_enabled_at TIMESTAMPTZ,
  
  -- Session management
  max_concurrent_sessions INTEGER DEFAULT 3,
  session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours default
  
  -- Access schedule (optional - for time-based access)
  access_schedule JSONB,
  /* Example:
  {
    "allowedDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "allowedHours": {"start": "08:00", "end": "18:00"},
    "timezone": "America/New_York"
  }
  */
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_reporting_users_email ON security.reporting_users(LOWER(email)) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_reporting_users_role ON security.reporting_users(role) 
  WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_reporting_users_active ON security.reporting_users(is_active) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_reporting_users_groups ON security.reporting_users USING gin(accessible_groups);
CREATE INDEX idx_reporting_users_orgs ON security.reporting_users USING gin(accessible_organizations);

COMMENT ON TABLE security.reporting_users IS 
  'Users with access to reporting system. Separate from operational users. Contains explicit group/org scoping.';
```

### User Sessions Table

```sql
CREATE TABLE security.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES security.reporting_users(id) ON DELETE CASCADE,
  
  -- Session details
  token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID for revocation
  refresh_token_hash VARCHAR(500), -- Hashed refresh token
  
  -- Client information
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(255)
);

CREATE INDEX idx_user_sessions_user ON security.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON security.user_sessions(token_jti);
CREATE INDEX idx_user_sessions_expiry ON security.user_sessions(expires_at) 
  WHERE revoked_at IS NULL;

COMMENT ON TABLE security.user_sessions IS 
  'Active reporting user sessions for token validation and revocation';
```

### Role Templates Table

```sql
CREATE TABLE security.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Default permissions for this role
  default_permissions JSONB NOT NULL,
  default_data_masking JSONB,
  
  -- Constraints
  max_groups_allowed INTEGER, -- NULL = unlimited
  max_orgs_allowed INTEGER,
  can_export_data BOOLEAN DEFAULT false,
  can_schedule_reports BOOLEAN DEFAULT false,
  can_view_audit_logs BOOLEAN DEFAULT false,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles
INSERT INTO security.role_templates (role_name, display_name, description, default_permissions, can_export_data, can_schedule_reports) VALUES
('super_admin', 'Super Administrator', 'Full system access', 
 '{"hr": {"viewEmployees": true, "viewDetails": true, "viewSalaries": true, "exportData": true}, "payroll": {"viewReports": true, "viewIndividual": true, "viewAggregates": true, "exportData": true}, "scheduling": {"viewSchedules": true}, "dataVisibility": {"level": "full_detail"}}'::jsonb,
 true, true),
 
('group_executive', 'Group Executive', 'Executive access to all organizations in assigned groups',
 '{"hr": {"viewEmployees": true, "viewDetails": true, "viewSalaries": true, "exportData": true}, "payroll": {"viewReports": true, "viewIndividual": true, "viewAggregates": true, "exportData": true}, "scheduling": {"viewSchedules": true}, "dataVisibility": {"level": "full_detail"}}'::jsonb,
 true, true),
 
('dept_head_hr', 'Department Head - HR', 'HR data access across organizations',
 '{"hr": {"viewEmployees": true, "viewDetails": true, "viewSalaries": false, "exportData": true}, "payroll": {"viewReports": true, "viewIndividual": false, "viewAggregates": true, "exportData": false}, "scheduling": {"viewSchedules": false}, "dataVisibility": {"level": "masked_detail"}}'::jsonb,
 true, true),
 
('auditor', 'Auditor', 'Aggregate data only for compliance',
 '{"hr": {"viewEmployees": false, "viewDetails": false, "viewSalaries": false, "exportData": false}, "payroll": {"viewReports": false, "viewIndividual": false, "viewAggregates": true, "exportData": false}, "scheduling": {"viewSchedules": false}, "dataVisibility": {"level": "aggregate_only"}}'::jsonb,
 false, false);
```

---

## 3. Audit Schema - Access Logging

### Access Audit Log Table

```sql
CREATE TABLE audit.access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who accessed
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  
  -- What was accessed
  report_type VARCHAR(100) NOT NULL, -- 'employee_summary', 'payroll_report', etc.
  report_category VARCHAR(50), -- 'hr', 'payroll', 'scheduling'
  
  -- Scope of access
  group_id UUID,
  group_name VARCHAR(255),
  organization_ids UUID[] NOT NULL, -- Which orgs were queried
  organization_names TEXT[], -- Human-readable org names
  
  -- Request details
  endpoint VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  query_params JSONB,
  filters_applied JSONB, -- What filters user applied
  
  -- Data accessed
  data_visibility_level VARCHAR(50), -- 'full_detail', 'masked_detail', 'aggregate_only'
  columns_accessed TEXT[], -- Which columns were selected
  rows_returned INTEGER,
  records_exported BOOLEAN DEFAULT false,
  export_format VARCHAR(20), -- 'pdf', 'excel', 'csv', etc.
  
  -- Response
  success BOOLEAN NOT NULL,
  http_status_code INTEGER,
  error_message TEXT,
  response_time_ms INTEGER, -- Query execution time
  
  -- Security context
  ip_address INET NOT NULL,
  user_agent TEXT,
  session_id UUID,
  
  -- Timing
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Alerting flags
  is_suspicious BOOLEAN DEFAULT false,
  alert_reason TEXT
);

-- Partitioning for performance (monthly partitions)
CREATE TABLE audit.access_audit_log_2025_11 PARTITION OF audit.access_audit_log
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Indexes
CREATE INDEX idx_audit_log_user ON audit.access_audit_log(user_id, accessed_at DESC);
CREATE INDEX idx_audit_log_time ON audit.access_audit_log(accessed_at DESC);
CREATE INDEX idx_audit_log_orgs ON audit.access_audit_log USING gin(organization_ids);
CREATE INDEX idx_audit_log_report_type ON audit.access_audit_log(report_type, accessed_at DESC);
CREATE INDEX idx_audit_log_suspicious ON audit.access_audit_log(is_suspicious) 
  WHERE is_suspicious = true;

COMMENT ON TABLE audit.access_audit_log IS 
  'Complete audit trail of all reporting access. Partitioned by month for performance.';
```

### Security Alerts Table

```sql
CREATE TABLE audit.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert details
  alert_type VARCHAR(100) NOT NULL, 
    -- 'excessive_access', 'unusual_hours', 'unauthorized_attempt', 'data_export_spike', etc.
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Related user
  user_id UUID,
  user_email VARCHAR(255),
  
  -- Alert description
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  details JSONB, -- Additional context
  
  -- Related records
  related_audit_log_ids UUID[], -- Links to audit log entries
  
  -- Status
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_alerts_user ON audit.security_alerts(user_id);
CREATE INDEX idx_security_alerts_status ON audit.security_alerts(status, severity);
CREATE INDEX idx_security_alerts_time ON audit.security_alerts(created_at DESC);
```

---

## 4. ETL Schema - Synchronization Control

### ETL Job Runs Table

```sql
CREATE TABLE etl.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job identification
  job_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental', 'snapshot'
  
  -- Execution details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'running' 
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  
  -- Data processed
  source_db VARCHAR(100) NOT NULL DEFAULT 'operational',
  target_schema VARCHAR(100) NOT NULL,
  rows_processed INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_deleted INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  triggered_by VARCHAR(50) DEFAULT 'scheduler', -- 'scheduler', 'manual', 'api'
  triggered_by_user UUID,
  server_hostname VARCHAR(255),
  process_id INTEGER
);

CREATE INDEX idx_etl_job_runs_job ON etl.job_runs(job_name, started_at DESC);
CREATE INDEX idx_etl_job_runs_status ON etl.job_runs(status);
CREATE INDEX idx_etl_job_runs_time ON etl.job_runs(started_at DESC);
```

### ETL Sync Log Table

```sql
CREATE TABLE etl.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_run_id UUID NOT NULL REFERENCES etl.job_runs(id),
  
  -- What was synced
  table_name VARCHAR(255) NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'upsert'
  
  -- Watermarks for incremental sync
  last_sync_timestamp TIMESTAMPTZ,
  last_sync_id UUID,
  
  -- Statistics
  rows_synced INTEGER DEFAULT 0,
  bytes_transferred BIGINT,
  duration_seconds INTEGER,
  
  -- Status
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_etl_sync_log_job ON etl.sync_log(job_run_id);
CREATE INDEX idx_etl_sync_log_table ON etl.sync_log(table_name, synced_at DESC);
```

---

**Status:** ✅ Schema Part 1 Complete  
**Next:** 02b - Operational Data Replication & Reporting Views
