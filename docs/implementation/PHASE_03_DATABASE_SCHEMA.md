# Phase 3: Database Schema Refactoring

**Duration:** 2 weeks  
**Dependencies:** Phase 1, Phase 2  
**Team:** Database Team + Architecture Team  
**Status:** Not Started

---

## 📋 Overview

Design and implement database schemas for multi-product architecture with separate schemas for each product, core schema for shared services, and integration schema for cross-product data.

**Note:** Since the system is not yet in production, we can implement optimal schema design from scratch without migration concerns.

---

## 🎯 Objectives

1. Design and create core schema with product subscription tables
2. Create separate schemas for each product (recruitment, payroll, hris, integrations)
3. Implement recruitment schema with optimal structure (can refactor existing tables)
4. Create schema creation scripts following DATABASE_STANDARDS.md
5. Test schemas on development environment

---

## 📊 Deliverables

### 1. Core Schema

**File:** `backend/src/database/migrations/001_create_core_schema.sql`

```sql
-- ============================================================================
-- CORE SCHEMA - Required for all products
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS core;

-- Organizations (tenants) - KEEP EXISTING, just move to core schema
CREATE TABLE core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  subscription_tier VARCHAR(50) DEFAULT 'starter',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_org_status CHECK (status IN ('active', 'suspended', 'cancelled'))
);

CREATE INDEX idx_core_organizations_status ON core.organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_core_organizations_slug ON core.organizations(slug) WHERE deleted_at IS NULL;

-- Users - KEEP EXISTING, just move to core schema
CREATE TABLE core.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  settings JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_user_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_core_users_org ON core.users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_core_users_email ON core.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_core_users_status ON core.users(status) WHERE deleted_at IS NULL;

-- ============================================================================
-- NEW: Product Subscriptions
-- ============================================================================

CREATE TABLE core.product_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,  -- 'recruitiq', 'payroll', 'hris'
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'suspended', 'cancelled', 'trial'
  tier VARCHAR(50) DEFAULT 'starter',   -- 'starter', 'professional', 'enterprise'
  features JSONB DEFAULT '[]'::jsonb,   -- Array of enabled features
  limits JSONB DEFAULT '{}'::jsonb,     -- { maxEmployees: 10, maxJobs: 5 }
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,               -- NULL for perpetual subscriptions
  trial_ends_at TIMESTAMPTZ,            -- NULL if not trial
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_subscription_status CHECK (status IN ('active', 'suspended', 'cancelled', 'trial', 'expired')),
  CONSTRAINT check_subscription_tier CHECK (tier IN ('starter', 'professional', 'enterprise', 'custom')),
  CONSTRAINT uq_org_product UNIQUE(organization_id, product_id)
);

CREATE INDEX idx_product_subs_org ON core.product_subscriptions(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_subs_status ON core.product_subscriptions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_subs_product ON core.product_subscriptions(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_subs_expires ON core.product_subscriptions(expires_at) WHERE status = 'active';

COMMENT ON TABLE core.product_subscriptions IS 'Tracks which products each organization has access to';

-- ============================================================================
-- NEW: Product Usage Tracking
-- ============================================================================

CREATE TABLE core.product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  metric VARCHAR(100) NOT NULL,        -- 'employees', 'payroll_runs', 'candidates', etc.
  value INTEGER NOT NULL,              -- Current count
  period_start TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP),
  period_end TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP + INTERVAL '1 month'),
  recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uq_usage_org_product_metric_period UNIQUE(organization_id, product_id, metric, period_start)
);

CREATE INDEX idx_product_usage_org_product ON core.product_usage(organization_id, product_id);
CREATE INDEX idx_product_usage_recorded ON core.product_usage(recorded_at);
CREATE INDEX idx_product_usage_period ON core.product_usage(period_start, period_end);

COMMENT ON TABLE core.product_usage IS 'Tracks product usage metrics for billing and limit enforcement';

-- ============================================================================
-- NEW: Product Permissions
-- ============================================================================

CREATE TABLE core.product_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  permission_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),                -- 'read', 'write', 'admin', 'feature'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uq_product_permission UNIQUE(product_id, permission_key)
);

CREATE INDEX idx_product_permissions_product ON core.product_permissions(product_id);
CREATE INDEX idx_product_permissions_category ON core.product_permissions(category);

COMMENT ON TABLE core.product_permissions IS 'Defines available permissions for each product';

-- ============================================================================
-- NEW: User Product Permissions
-- ============================================================================

CREATE TABLE core.user_product_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID REFERENCES core.users(id),
  expires_at TIMESTAMPTZ,              -- NULL for permanent permissions
  
  CONSTRAINT uq_user_product_permission UNIQUE(user_id, product_id, permission_key)
);

CREATE INDEX idx_user_product_perms_user ON core.user_product_permissions(user_id);
CREATE INDEX idx_user_product_perms_product ON core.user_product_permissions(product_id);
CREATE INDEX idx_user_product_perms_expires ON core.user_product_permissions(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE core.user_product_permissions IS 'Grants specific product permissions to users';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT USAGE ON SCHEMA core TO recruitiq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO recruitiq_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO recruitiq_app;
```

### 2. Product-Specific Schemas

**File:** `backend/src/database/migrations/002_create_product_schemas.sql`

```sql
-- ============================================================================
-- RECRUITMENT SCHEMA - RecruitIQ Product
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS recruitment;

COMMENT ON SCHEMA recruitment IS 'RecruitIQ - Applicant Tracking System';

-- ============================================================================
-- PAYROLL SCHEMA - Paylinq Product
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS payroll;

COMMENT ON SCHEMA payroll IS 'Paylinq - Payroll Management System';

-- ============================================================================
-- HRIS SCHEMA - Nexus Product
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS hris;

COMMENT ON SCHEMA hris IS 'Nexus - Human Resources Information System';

-- ============================================================================
-- INTEGRATIONS SCHEMA - Cross-Product Data
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS integrations;

COMMENT ON SCHEMA integrations IS 'Cross-product integration mappings and data sync';

-- Grant permissions
GRANT USAGE ON SCHEMA recruitment TO recruitiq_app;
GRANT USAGE ON SCHEMA payroll TO recruitiq_app;
GRANT USAGE ON SCHEMA hris TO recruitiq_app;
GRANT USAGE ON SCHEMA integrations TO recruitiq_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA recruitment TO recruitiq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payroll TO recruitiq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hris TO recruitiq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA integrations TO recruitiq_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA recruitment TO recruitiq_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA payroll TO recruitiq_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hris TO recruitiq_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA integrations TO recruitiq_app;
```

### 3. Integration Schema Tables

**File:** `backend/src/database/migrations/003_create_integration_tables.sql`

```sql
-- ============================================================================
-- INTEGRATION TABLES - Cross-Product Mappings
-- ============================================================================

-- Candidate to Employee mapping (RecruitIQ → HRIS)
CREATE TABLE integrations.candidate_employee_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,          -- From recruitment.candidates
  employee_id UUID NOT NULL,           -- From hris.employees
  job_id UUID,                         -- From recruitment.jobs
  converted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  converted_by UUID REFERENCES core.users(id),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT uq_candidate_employee UNIQUE(candidate_id)
);

CREATE INDEX idx_candidate_emp_map_org ON integrations.candidate_employee_map(organization_id);
CREATE INDEX idx_candidate_emp_map_candidate ON integrations.candidate_employee_map(candidate_id);
CREATE INDEX idx_candidate_emp_map_employee ON integrations.candidate_employee_map(employee_id);

COMMENT ON TABLE integrations.candidate_employee_map IS 'Maps recruited candidates to HRIS employees';

-- Employee to Payroll mapping (HRIS → Payroll)
CREATE TABLE integrations.employee_payroll_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,           -- From hris.employees
  payroll_record_id UUID NOT NULL,     -- From payroll.employees
  sync_status VARCHAR(50) DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sync_errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT uq_employee_payroll UNIQUE(employee_id)
);

CREATE INDEX idx_employee_payroll_map_org ON integrations.employee_payroll_map(organization_id);
CREATE INDEX idx_employee_payroll_map_employee ON integrations.employee_payroll_map(employee_id);
CREATE INDEX idx_employee_payroll_map_payroll ON integrations.employee_payroll_map(payroll_record_id);
CREATE INDEX idx_employee_payroll_map_status ON integrations.employee_payroll_map(sync_status);

COMMENT ON TABLE integrations.employee_payroll_map IS 'Maps HRIS employees to payroll records';

-- Cross-Product Events Log
CREATE TABLE integrations.cross_product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  source_product VARCHAR(50) NOT NULL,
  target_product VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_event_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_cross_product_events_org ON integrations.cross_product_events(organization_id);
CREATE INDEX idx_cross_product_events_status ON integrations.cross_product_events(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_cross_product_events_created ON integrations.cross_product_events(created_at);

COMMENT ON TABLE integrations.cross_product_events IS 'Logs cross-product integration events for processing and auditing';
```

### 4. Recruitment Schema Tables

**File:** `backend/src/database/migrations/004_create_recruitment_schema_tables.sql`

```sql
-- ============================================================================
-- RECRUITMENT SCHEMA TABLES - RecruitIQ Product
-- ============================================================================

-- Note: Since not in production, we can restructure existing tables optimally
-- Existing table structures can be reference, but we'll create clean versions

BEGIN;

-- Workspaces (tenant subdivisions)
CREATE TABLE recruitment.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_recruitment_workspaces_org ON recruitment.workspaces(organization_id) WHERE deleted_at IS NULL;

-- Jobs
CREATE TABLE recruitment.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES recruitment.workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  department VARCHAR(100),
  location VARCHAR(255),
  employment_type VARCHAR(50) NOT NULL DEFAULT 'full-time',
  salary_min NUMERIC(10, 2),
  salary_max NUMERIC(10, 2),
  salary_currency VARCHAR(3) DEFAULT 'USD',
  skills JSONB DEFAULT '[]'::jsonb,
  requirements JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_job_status CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  CONSTRAINT check_salary CHECK (salary_max IS NULL OR salary_max >= salary_min)
);

CREATE INDEX idx_recruitment_jobs_org ON recruitment.jobs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_jobs_workspace ON recruitment.jobs(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_jobs_status ON recruitment.jobs(status) WHERE deleted_at IS NULL AND is_published = true;

-- Candidates
CREATE TABLE recruitment.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(255),
  resume_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  experience_years INTEGER,
  education JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT uq_candidate_email_org UNIQUE(organization_id, email, deleted_at)
);

CREATE INDEX idx_recruitment_candidates_org ON recruitment.candidates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_candidates_email ON recruitment.candidates(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_candidates_status ON recruitment.candidates(status) WHERE deleted_at IS NULL;

-- Applications
CREATE TABLE recruitment.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES recruitment.jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES recruitment.candidates(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  stage VARCHAR(100),
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  cover_letter TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT uq_application_job_candidate UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_recruitment_applications_org ON recruitment.applications(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_applications_job ON recruitment.applications(job_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_applications_candidate ON recruitment.applications(candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_applications_status ON recruitment.applications(status) WHERE deleted_at IS NULL;

-- Interviews
CREATE TABLE recruitment.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  application_id UUID REFERENCES recruitment.applications(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location VARCHAR(255),
  meeting_url TEXT,
  interviewer_ids JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  feedback TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_interview_type CHECK (type IN ('phone', 'video', 'in-person', 'technical', 'panel')),
  CONSTRAINT check_interview_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  CONSTRAINT check_interview_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX idx_recruitment_interviews_org ON recruitment.interviews(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_interviews_app ON recruitment.interviews(application_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recruitment_interviews_scheduled ON recruitment.interviews(scheduled_at) WHERE deleted_at IS NULL;

COMMENT ON SCHEMA recruitment IS 'RecruitIQ - Applicant Tracking System';

COMMIT;
```

**Note:** This creates fresh, optimal table structures. Since we're not in production, we can refactor existing development tables to match this structure.

---

## 🔍 Detailed Tasks

### Task 3.1: Create Core Schema (2 days)

**Assignee:** Database Lead

**Actions:**
1. ✅ Create migration script for core schema
2. ✅ Create core.organizations table
3. ✅ Create core.users table
4. ✅ Create core.product_subscriptions table
5. ✅ Create core.product_usage table
6. ✅ Create core.product_permissions table
7. ✅ Create core.user_product_permissions table
8. ✅ Add all indexes and constraints
9. ✅ Test on staging database

**Standards:** Follow DATABASE_STANDARDS.md for all table definitions

### Task 3.2: Create Product Schemas (1 day)

**Assignee:** Database Team

**Actions:**
1. ✅ Create recruitment schema
2. ✅ Create payroll schema
3. ✅ Create hris schema
4. ✅ Create integrations schema
5. ✅ Set up permissions
6. ✅ Test schema creation

### Task 3.3: Create Integration Tables (1 day)

**Assignee:** Database Team

**Actions:**
1. ✅ Create candidate_employee_map table
2. ✅ Create employee_payroll_map table
3. ✅ Create cross_product_events table
4. ✅ Add indexes
5. ✅ Test on staging

### Task 3.4: Create Recruitment Schema Tables (1 day)

**Assignee:** Database Team

**Actions:**
1. ✅ Create recruitment.workspaces table
2. ✅ Create recruitment.jobs table  
3. ✅ Create recruitment.candidates table
4. ✅ Create recruitment.applications table
5. ✅ Create recruitment.interviews table
6. ✅ Add all indexes and constraints

### Task 3.5: Testing on Development (1 day)

**Assignee:** QA Team + Database Team

**Actions:**
1. ✅ Run all schema creation scripts
2. ✅ Test with sample data
3. ✅ Test query performance
4. ✅ Verify indexes are used
5. ✅ Test schema permissions
6. ✅ Document any issues

### Task 3.6: Performance Optimization (1 day)

**Assignee:** Database Team

**Actions:**
1. ✅ Analyze query plans
2. ✅ Add missing indexes
3. ✅ Optimize slow queries
4. ✅ Configure autovacuum if needed
5. ✅ Document performance baseline

### Task 3.7: Documentation (1 day)

**Assignee:** Documentation Team

**Actions:**
1. ✅ Document new schema structure
2. ✅ Create ERD diagrams
3. ✅ Document migration procedures
4. ✅ Document rollback procedures
5. ✅ Update developer guides

---

## 📋 Standards Compliance Checklist

- [ ] All tables follow DATABASE_STANDARDS.md naming conventions
- [ ] All tables have required audit columns (created_at, updated_at, etc.)
- [ ] All tables have organization_id for tenant isolation
- [ ] All tables support soft delete (deleted_at column)
- [ ] All foreign keys have indexes
- [ ] All queries use parameterized statements
- [ ] Migration scripts are idempotent
- [ ] Rollback scripts are tested

---

## 🎯 Success Criteria

Phase 3 is complete when:

1. ✅ Core schema created with all required tables
2. ✅ Product schemas created
3. ✅ Integration tables created
4. ✅ All existing data migrated successfully
5. ✅ All tests pass on staging environment
6. ✅ Performance meets targets (<200ms queries)
7. ✅ Rollback procedures tested
8. ✅ Documentation complete

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Suboptimal schema design | Medium | Peer review, reference best practices, plan for future scaling |
| Performance issues | Medium | Comprehensive indexing, query optimization, load testing |
| Schema permission issues | Low | Test permissions thoroughly, document access patterns |
| Missing constraints | Low | Complete checklist review, automated schema validation |

**Note:** Risk profile significantly reduced since we're building from scratch, not migrating production data.

---

## ⏭️ Next Phase

**[Phase 4: RecruitIQ Product Extraction](./PHASE_04_RECRUITIQ_EXTRACTION.md)**

---

**Phase Owner:** Database Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
