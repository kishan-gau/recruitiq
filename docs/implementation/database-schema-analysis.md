# Database Schema Analysis

**Last Updated:** November 3, 2025  
**Purpose:** Comprehensive analysis of the current RecruitIQ database schema to prepare for multi-product transformation

---

## 📋 Executive Summary

The current RecruitIQ database consists of **27 tables** across 4 major functional areas:
1. **Core Application** (15 tables) - ATS functionality
2. **Logging & Monitoring** (3 tables) - Centralized logging
3. **Deployment Infrastructure** (2 tables) - VPS management
4. **License Management** (7 tables) - License tracking and telemetry

**Database Technology:** PostgreSQL with UUID primary keys and JSONB support

---

## 🗄️ Complete Table Inventory

### 1. Core Application Tables (15)

| # | Table Name | Primary Purpose | Rows (Est) | Foreign Keys |
|---|------------|-----------------|------------|--------------|
| 1 | **organizations** | Top-level tenants | 100-1K | 1 (vps_instances) |
| 2 | **permissions** | Permission definitions | 50-100 | 0 |
| 3 | **roles** | Role definitions | 10-20 | 0 |
| 4 | **role_permissions** | Role-permission mapping | 100-500 | 2 (roles, permissions) |
| 5 | **users** | User accounts | 1K-10K | 2 (organizations, roles) |
| 6 | **refresh_tokens** | Active sessions | 5K-50K | 1 (users) |
| 7 | **workspaces** | Sub-tenants | 100-1K | 2 (organizations, users) |
| 8 | **workspace_members** | User-workspace associations | 1K-10K | 2 (workspaces, users) |
| 9 | **flow_templates** | Workflow templates | 50-500 | 3 (organizations, workspaces, users) |
| 10 | **jobs** | Job postings | 1K-100K | 5 (orgs, workspaces, flow_templates, users×2) |
| 11 | **candidates** | Candidate profiles | 10K-1M | 2 (organizations, users) |
| 12 | **applications** | Job applications | 10K-1M | 4 (jobs, candidates, organizations, workspaces) |
| 13 | **interviews** | Interview scheduling | 5K-500K | 2 (applications, users) |
| 14 | **interview_interviewers** | Interview-user mapping | 5K-500K | 2 (interviews, users) |
| 15 | **communications** | Email/SMS logs | 10K-1M | 3 (applications, users, candidates) |

### 2. Logging & Monitoring Tables (3)

| # | Table Name | Primary Purpose | Rows (Est) | Foreign Keys |
|---|------------|-----------------|------------|--------------|
| 16 | **system_logs** | Application logs | 1M-100M | 0 (tenant_id is VARCHAR) |
| 17 | **security_events** | Security tracking | 100K-10M | 0 (tenant_id is VARCHAR) |
| 18 | **security_alerts** | Security alerts | 1K-100K | 1 (security_events) |

### 3. Deployment Infrastructure Tables (2)

| # | Table Name | Primary Purpose | Rows (Est) | Foreign Keys |
|---|------------|-----------------|------------|--------------|
| 19 | **vps_instances** | VPS server management | 10-100 | 1 (organizations) |
| 20 | **instance_deployments** | Deployment tracking | 100-1K | 2 (organizations, vps_instances) |

### 4. License Management Tables (7)

| # | Table Name | Primary Purpose | Rows (Est) | Foreign Keys |
|---|------------|-----------------|------------|--------------|
| 21 | **customers** | License customers | 100-1K | 1 (organizations) |
| 22 | **tier_presets** | Tier configurations | 10-50 | 1 (users) |
| 23 | **licenses** | License keys | 100-1K | 2 (customers, tier_presets) |
| 24 | **instances** | Installation instances | 100-1K | 1 (customers) |
| 25 | **usage_events** | Usage telemetry | 1M-100M | 1 (customers) |
| 26 | **tier_migrations** | Tier upgrades/downgrades | 100-1K | 2 (tier_presets) |
| 27 | **license_audit_log** | License change audit trail | 1K-100K | 2 (customers, users) |

**Total Tables:** 27  
**Total Indexes:** 70+  
**Total Views:** 6

---

## 📐 Entity Relationship Diagram

### Core Application Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORE APPLICATION SCHEMA                             │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │  organizations   │
                         │ ──────────────── │
                         │ id (PK)          │
                         │ name             │
                         │ tier             │
                         │ max_users        │
                         │ vps_id (FK)      │──────┐
                         └────────┬─────────┘       │
                                  │                 │
                 ┌────────────────┼─────────────┐   │
                 │                │             │   │
                 ▼                ▼             ▼   ▼
        ┌────────────────┐  ┌──────────┐  ┌─────────────────┐
        │ workspaces     │  │  users   │  │  vps_instances  │
        │ ────────────── │  │ ──────── │  │ ──────────────  │
        │ id (PK)        │  │ id (PK)  │  │ id (PK)         │
        │ organization_id│◄─┤ org_id   │  │ vps_name        │
        │ name           │  │ email    │  │ vps_ip          │
        └───────┬────────┘  │ role_id  │  │ organization_id │◄─┘
                │           └────┬─────┘  └─────────────────┘
                │                │
                │        ┌───────┼───────────────┐
                │        │       │               │
                │        ▼       ▼               ▼
                │   ┌─────────────────┐  ┌──────────────────┐
                │   │ refresh_tokens  │  │ workspace_members│
                │   │ ─────────────── │  │ ────────────────│
                │   │ id (PK)         │  │ id (PK)         │
                │   │ user_id (FK)    │  │ workspace_id    │◄──┐
                │   │ token           │  │ user_id (FK)    │   │
                │   └─────────────────┘  └─────────────────┘   │
                │                                               │
                └───────────────────────────────────────────────┘
                
        ┌──────────────────────────────────────────────────────────────┐
        │                    RECRUITING WORKFLOW                        │
        └──────────────────────────────────────────────────────────────┘
        
        ┌────────────────┐
        │ flow_templates │
        │ ────────────── │
        │ id (PK)        │
        │ organization_id│
        │ workspace_id   │
        │ stages (JSON)  │
        └───────┬────────┘
                │
                ▼
        ┌────────────────┐
        │     jobs       │
        │ ────────────── │
        │ id (PK)        │
        │ organization_id│
        │ workspace_id   │
        │ flow_template_id│
        │ title          │
        │ status         │
        │ public_slug    │
        └───────┬────────┘
                │
                ▼
        ┌────────────────┐          ┌─────────────────┐
        │  applications  │◄─────────┤   candidates    │
        │ ────────────── │          │ ─────────────── │
        │ id (PK)        │          │ id (PK)         │
        │ job_id (FK)    │          │ organization_id │
        │ candidate_id───│──────────┤ first_name      │
        │ stage          │          │ last_name       │
        │ status         │          │ email           │
        │ tracking_code  │          │ resume_url      │
        └───────┬────────┘          └─────────────────┘
                │
                ├──────────────────────────────┐
                │                              │
                ▼                              ▼
        ┌────────────────┐          ┌─────────────────┐
        │  interviews    │          │ communications  │
        │ ────────────── │          │ ───────────────│
        │ id (PK)        │          │ id (PK)        │
        │ application_id │          │ application_id │
        │ type           │          │ message_type   │
        │ scheduled_at   │          │ message        │
        │ status         │          │ from_type      │
        └───────┬────────┘          └────────────────┘
                │
                ▼
        ┌────────────────────────┐
        │ interview_interviewers │
        │ ────────────────────── │
        │ id (PK)                │
        │ interview_id (FK)      │
        │ user_id (FK)           │
        └────────────────────────┘
```

### Authorization Schema

```
┌───────────────────────────────────────────────────────────┐
│                   AUTHORIZATION SCHEMA                     │
└───────────────────────────────────────────────────────────┘

        ┌────────────────┐              ┌─────────────────┐
        │  permissions   │              │     roles       │
        │ ────────────── │              │ ─────────────── │
        │ id (PK)        │              │ id (PK)         │
        │ name           │              │ name            │
        │ category       │              │ role_type       │
        └───────┬────────┘              │ level           │
                │                       └────────┬────────┘
                │                                │
                └──────────┐         ┌───────────┘
                           │         │
                           ▼         ▼
                    ┌──────────────────────┐
                    │ role_permissions     │
                    │ ──────────────────── │
                    │ id (PK)              │
                    │ role_id (FK)         │
                    │ permission_id (FK)   │
                    └──────────┬───────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │    users    │
                        │ ─────────── │
                        │ role_id (FK)│
                        └─────────────┘
```

### License Management Schema

```
┌───────────────────────────────────────────────────────────┐
│                LICENSE MANAGEMENT SCHEMA                   │
└───────────────────────────────────────────────────────────┘

        ┌────────────────┐
        │   customers    │
        │ ────────────── │
        │ id (PK)        │
        │ organization_id│
        │ tier           │
        │ instance_key   │
        └───────┬────────┘
                │
                ├─────────────────────────────────┐
                │                                 │
                ▼                                 ▼
        ┌────────────────┐              ┌─────────────────┐
        │   licenses     │              │   instances     │
        │ ────────────── │              │ ─────────────── │
        │ id (PK)        │              │ id (PK)         │
        │ customer_id    │              │ customer_id     │
        │ license_key    │              │ instance_key    │
        │ tier_preset_id │◄──┐          │ last_heartbeat  │
        │ expires_at     │   │          └─────────────────┘
        └────────────────┘   │
                             │
                ┌────────────┴──────┐
                │   tier_presets    │
                │ ───────────────── │
                │ id (PK)           │
                │ tier_name         │
                │ max_users         │
                │ features (JSON)   │
                └───────────────────┘
```

---

## 📊 Detailed Table Analysis

### 1. Organizations Table

**Purpose:** Top-level tenant isolation

**Key Columns:**
- `id` (UUID PK) - Unique identifier
- `name` (VARCHAR) - Organization name
- `slug` (VARCHAR UNIQUE) - URL-safe identifier
- `tier` (VARCHAR) - Subscription tier (starter/professional/enterprise)
- `max_users`, `max_workspaces`, `max_jobs`, `max_candidates` - License limits
- `deployment_model` (VARCHAR) - 'shared' or 'dedicated'
- `vps_id` (UUID FK) - References vps_instances for dedicated deployments
- `mfa_required` (BOOLEAN) - Organization-wide MFA enforcement
- `session_policy` (VARCHAR) - 'single' or 'multiple' sessions per user

**Indexes:**
- `idx_organizations_slug` - Lookup by slug
- `idx_organizations_tier` - Filter by tier
- `idx_organizations_deployment` - Filter by deployment model
- `idx_organizations_vps` - Join with VPS instances

**Relationships:**
- **Has Many:** users, workspaces, flow_templates, jobs, candidates, applications
- **Belongs To:** vps_instances (for dedicated deployments)

### 2. Users Table

**Purpose:** Unified user accounts for platform admins and tenant users

**Key Columns:**
- `id` (UUID PK)
- `organization_id` (UUID FK) - NULL for platform admins, set for tenant users
- `email` (VARCHAR UNIQUE)
- `password_hash` (VARCHAR) - bcrypt hash
- `user_type` (VARCHAR) - 'platform' or 'tenant'
- `role_id` (UUID FK) - References roles table for RBAC
- `legacy_role` (VARCHAR) - Deprecated field for backward compatibility
- `mfa_enabled` (BOOLEAN)
- `mfa_secret` (VARCHAR) - TOTP secret
- `failed_login_attempts` (INTEGER)
- `locked_until` (TIMESTAMP) - Account lockout expiry
- `is_active` (BOOLEAN) - Enable/disable user without deletion

**Indexes:**
- `idx_users_organization_id` - Filter by organization
- `idx_users_email` - Login lookups
- `idx_users_role_id` - Join with roles
- `idx_users_user_type` - Filter platform vs tenant users
- `idx_users_is_active` - Filter active users

**Relationships:**
- **Belongs To:** organizations, roles
- **Has Many:** refresh_tokens, workspace_members, jobs, candidates, applications, interviews
- **Many-to-Many:** workspaces (through workspace_members)

### 3. Workspaces Table

**Purpose:** Sub-tenants within an organization for department/team isolation

**Key Columns:**
- `id` (UUID PK)
- `organization_id` (UUID FK) - Parent organization
- `name` (VARCHAR)
- `settings` (JSONB) - Workspace-specific configuration
- `created_by` (UUID FK) - User who created the workspace

**Indexes:**
- `idx_workspaces_organization_id` - Filter by organization

**Relationships:**
- **Belongs To:** organizations
- **Has Many:** workspace_members, flow_templates, jobs, applications
- **Many-to-Many:** users (through workspace_members)

### 4. Jobs Table

**Purpose:** Job postings with public portal support

**Key Columns:**
- `id` (UUID PK)
- `organization_id`, `workspace_id` (UUID FK)
- `title`, `department`, `location` (VARCHAR)
- `employment_type` (ENUM) - full-time, part-time, contract, etc.
- `description`, `requirements`, `responsibilities` (TEXT)
- `salary_min`, `salary_max` (INTEGER)
- `status` (ENUM) - draft, open, paused, filled, closed, archived
- `is_public` (BOOLEAN) - Show on public job portal
- `public_slug` (VARCHAR UNIQUE) - URL-friendly identifier
- `public_portal_settings` (JSONB) - Company branding, custom fields
- `flow_template_id` (UUID FK) - Workflow template
- `hiring_manager_id`, `recruiter_id` (UUID FK) - Team assignments

**Indexes:**
- `idx_jobs_organization_id`, `idx_jobs_workspace_id` - Tenant filtering
- `idx_jobs_status` - Filter by status
- `idx_jobs_public_slug` - Public job page lookups
- `idx_jobs_is_public` - Show only public jobs on portal
- `idx_jobs_flow_template_id` - Join with templates

**Relationships:**
- **Belongs To:** organizations, workspaces, flow_templates, users (hiring_manager, recruiter)
- **Has Many:** applications

### 5. Candidates Table

**Purpose:** Candidate profiles with resume storage

**Key Columns:**
- `id` (UUID PK)
- `organization_id` (UUID FK)
- `first_name`, `last_name`, `email`, `phone` (VARCHAR)
- `current_job_title`, `current_company` (VARCHAR)
- `linkedin_url`, `portfolio_url`, `resume_url` (VARCHAR)
- `skills` (TEXT[]) - Array of skills
- `application_source` (ENUM) - manual, public-portal, referral, linkedin, etc.
- `tracking_code` (VARCHAR UNIQUE) - Public tracking identifier
- `tags` (TEXT[]) - Custom tags

**Indexes:**
- `idx_candidates_organization_id` - Tenant filtering
- `idx_candidates_email` - Email lookups
- `idx_candidates_name` - Name search

**Relationships:**
- **Belongs To:** organizations
- **Has Many:** applications

### 6. Applications Table

**Purpose:** Links candidates to jobs with workflow tracking

**Key Columns:**
- `id` (UUID PK)
- `job_id`, `candidate_id` (UUID FK)
- `organization_id`, `workspace_id` (UUID FK)
- `tracking_code` (VARCHAR UNIQUE) - Public tracking identifier
- `status` (ENUM) - active, rejected, withdrawn, hired
- `stage` (ENUM) - applied, screening, interview, offer, hired, rejected
- `current_stage` (INTEGER) - Stage number in flow
- `current_stage_name` (VARCHAR) - Stage name from flow template
- `applied_at` (TIMESTAMP)

**Indexes:**
- `idx_applications_job_id` - Applications per job
- `idx_applications_candidate_id` - Applications per candidate
- `idx_applications_organization_id`, `idx_applications_workspace_id` - Tenant filtering
- `idx_applications_tracking_code` - Public tracking page lookups
- `idx_applications_status`, `idx_applications_stage` - Pipeline filtering

**Relationships:**
- **Belongs To:** jobs, candidates, organizations, workspaces
- **Has Many:** interviews, communications

### 7. Interviews Table

**Purpose:** Interview scheduling with feedback tracking

**Key Columns:**
- `id` (UUID PK)
- `application_id` (UUID FK)
- `title`, `type` (VARCHAR) - phone, video, onsite, technical, behavioral, panel
- `status` (ENUM) - scheduled, completed, cancelled, no_show
- `scheduled_at` (TIMESTAMP)
- `duration_minutes` (INTEGER)
- `location`, `meeting_link` (VARCHAR)
- `feedback`, `notes` (TEXT)
- `rating` (INTEGER 1-5)
- `technical_skills` (JSONB) - Structured feedback

**Indexes:**
- `idx_interviews_application_id` - Interviews per application
- `idx_interviews_scheduled_at` - Calendar views

**Relationships:**
- **Belongs To:** applications
- **Many-to-Many:** users (through interview_interviewers)

### 8. Refresh Tokens Table

**Purpose:** Session management with device tracking

**Key Columns:**
- `id` (UUID PK)
- `user_id` (UUID FK)
- `token` (VARCHAR UNIQUE) - JWT refresh token
- `expires_at` (TIMESTAMP)
- `revoked_at` (TIMESTAMP) - Manual revocation
- `user_agent`, `ip_address` (VARCHAR) - Device tracking
- `device_fingerprint` (VARCHAR) - SHA-256 hash of device characteristics
- `device_name` (VARCHAR) - Human-readable (e.g., "iPhone")
- `last_used_at` (TIMESTAMP) - Session activity tracking
- `replaced_by_token` (VARCHAR) - Token rotation support

**Indexes:**
- `idx_refresh_tokens_user_id` - User's sessions
- `idx_refresh_tokens_token` - Token validation
- `idx_refresh_tokens_user_active` - Active sessions per user (WHERE revoked_at IS NULL)
- `idx_refresh_tokens_device_fingerprint` - Detect multiple sessions from same device
- `idx_refresh_tokens_expires_at` - Cleanup expired tokens

**Relationships:**
- **Belongs To:** users

---

## 🔗 Foreign Key Relationships

### Primary Relationships

```sql
-- Organization is the root tenant
organizations (id) ← users (organization_id)
organizations (id) ← workspaces (organization_id)
organizations (id) ← flow_templates (organization_id)
organizations (id) ← jobs (organization_id)
organizations (id) ← candidates (organization_id)
organizations (id) ← applications (organization_id)

-- Workspace provides sub-tenant isolation
workspaces (id) ← workspace_members (workspace_id)
workspaces (id) ← flow_templates (workspace_id)
workspaces (id) ← jobs (workspace_id)
workspaces (id) ← applications (workspace_id)

-- User relationships
users (id) ← refresh_tokens (user_id)
users (id) ← workspace_members (user_id)
users (id) ← jobs (hiring_manager_id)
users (id) ← jobs (recruiter_id)
users (id) ← interviews (created_by)
users (id) ← interview_interviewers (user_id)

-- Recruiting workflow
flow_templates (id) ← jobs (flow_template_id)
jobs (id) ← applications (job_id)
candidates (id) ← applications (candidate_id)
applications (id) ← interviews (application_id)
applications (id) ← communications (application_id)
interviews (id) ← interview_interviewers (interview_id)

-- RBAC
roles (id) ← users (role_id)
roles (id) ← role_permissions (role_id)
permissions (id) ← role_permissions (permission_id)

-- Deployment
vps_instances (id) ← organizations (vps_id)
vps_instances (id) ← instance_deployments (vps_id)
organizations (id) ← instance_deployments (organization_id)

-- License Management
customers (id) ← licenses (customer_id)
customers (id) ← instances (customer_id)
tier_presets (id) ← licenses (tier_preset_id)
security_events (id) ← security_alerts (security_event_id)
```

**Total Foreign Keys:** 40+

---

## 📈 Index Strategy

### Index Distribution by Purpose

**Lookup Indexes (Primary Access Patterns):**
- `users.email` - Login lookups
- `jobs.public_slug` - Public job pages
- `applications.tracking_code` - Application tracking
- `refresh_tokens.token` - Session validation

**Tenant Filtering Indexes:**
- All `organization_id` columns - Mandatory tenant isolation
- All `workspace_id` columns - Sub-tenant filtering

**Status/Category Filtering:**
- `jobs.status` - Job pipeline
- `applications.status`, `applications.stage` - Candidate pipeline
- `interviews.scheduled_at` - Calendar views
- `users.is_active` - Active users only

**Composite Indexes:**
- `refresh_tokens(user_id, revoked_at, expires_at)` - Active sessions per user
- `system_logs(tenant_id, timestamp DESC)` - Tenant-specific log queries
- `security_events(severity, timestamp DESC)` - Critical events first

**JSONB GIN Indexes:**
- `system_logs.metadata` - Search within log metadata
- `security_events.metadata` - Search within event data

**Total Indexes:** 70+

---

## 🎯 Multi-Product Database Design Recommendations

### Shared Tables (Keep As-Is)

These tables will be **shared across all products** (RecruitIQ, Paylinq, Nexus):

✅ **organizations** - Single organization can use multiple products
✅ **users** - Single user account across all products
✅ **permissions** - Unified permission system
✅ **roles** - Unified role system with product-specific roles
✅ **role_permissions** - Unified RBAC
✅ **refresh_tokens** - Single sign-on across products
✅ **workspaces** - Shared workspace concept
✅ **workspace_members** - Unified team management
✅ **system_logs** - Centralized logging for all products
✅ **security_events** - Unified security monitoring
✅ **security_alerts** - Unified alerting
✅ **vps_instances** - Shared infrastructure
✅ **instance_deployments** - Shared deployment tracking
✅ **customers** - Unified customer management
✅ **tier_presets** - Multi-product tier configurations
✅ **licenses** - Multi-product licensing
✅ **instances** - Unified instance tracking
✅ **usage_events** - Multi-product telemetry
✅ **tier_migrations** - Unified tier migrations
✅ **license_audit_log** - Unified audit trail

### Product-Specific Tables (Reorganize)

#### RecruitIQ Tables (Keep, Rename with Prefix)
- `recruitiq_flow_templates` (was: flow_templates)
- `recruitiq_jobs` (was: jobs)
- `recruitiq_candidates` (was: candidates)
- `recruitiq_applications` (was: applications)
- `recruitiq_interviews` (was: interviews)
- `recruitiq_interview_interviewers` (was: interview_interviewers)
- `recruitiq_communications` (was: communications)

#### Paylinq Tables (New - from Phase 8)
- `paylinq_worker_types`
- `paylinq_worker_type_templates`
- `paylinq_pay_components`
- `paylinq_pay_formulas`
- `paylinq_tax_rule_sets`
- `paylinq_tax_brackets`
- `paylinq_tax_allowances`
- `paylinq_time_attendance_entries`
- `paylinq_time_attendance_approvals`
- `paylinq_rated_time_lines`
- `paylinq_work_schedules`
- `paylinq_shift_assignments`
- `paylinq_schedule_change_requests`
- `paylinq_payroll_runs`
- `paylinq_payroll_run_components`
- `paylinq_reconciliation_records`
- `paylinq_reconciliation_items`
- `paylinq_variance_explanations`
- `paylinq_deductions`
- `paylinq_worker_deductions`
- `paylinq_payment_history`
- `paylinq_payment_batches`
...and more (35 total)

#### Nexus Tables (New - from Phase 11)
- `nexus_user_accounts` (separate from core users table)
- `nexus_employees`
- `nexus_departments`
- `nexus_locations`
- `nexus_positions`
- `nexus_sequence_policies`
- `nexus_sequence_steps`
- `nexus_contracts`
- `nexus_leave_policies`
- `nexus_leave_requests`
- `nexus_leave_balances`
- `nexus_attendance_records`
- `nexus_rules`
- `nexus_rule_execution_logs`
- `nexus_performance_reviews`
- `nexus_benefits`
- `nexus_documents`
...and more (30+ total)

### Naming Convention

**Pattern:** `{product}_{table_name}`

**Example:**
```sql
-- Old (current)
CREATE TABLE jobs (...);
CREATE TABLE candidates (...);

-- New (multi-product)
CREATE TABLE recruitiq_jobs (...);
CREATE TABLE recruitiq_candidates (...);
CREATE TABLE paylinq_payroll_runs (...);
CREATE TABLE nexus_employees (...);
```

### Schema Versioning

```sql
-- Add schema_version to track database state
CREATE TABLE schema_versions (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  product VARCHAR(50) NOT NULL, -- 'core', 'recruitiq', 'paylinq', 'nexus'
  description TEXT,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Example entries
INSERT INTO schema_versions (version, product, description) VALUES
  ('1.0.0', 'core', 'Initial core tables'),
  ('1.0.0', 'recruitiq', 'Initial RecruitIQ tables'),
  ('1.0.0', 'paylinq', 'Initial Paylinq tables'),
  ('1.0.0', 'nexus', 'Initial Nexus tables');
```

---

## 🔍 Query Pattern Analysis

### Most Common Queries

1. **User Authentication**
```sql
SELECT * FROM users 
WHERE email = $1 AND is_active = TRUE;
-- Uses: idx_users_email
-- Frequency: Very High (every login)
```

2. **Tenant Filtering**
```sql
SELECT * FROM jobs 
WHERE organization_id = $1 AND workspace_id = $2;
-- Uses: idx_jobs_organization_id, idx_jobs_workspace_id
-- Frequency: Very High (every data access)
```

3. **Application Pipeline**
```sql
SELECT a.*, c.*, j.title
FROM applications a
JOIN candidates c ON a.candidate_id = c.id
JOIN jobs j ON a.job_id = j.id
WHERE a.workspace_id = $1
ORDER BY a.applied_at DESC;
-- Uses: Multiple indexes
-- Frequency: High (dashboard views)
```

4. **Session Validation**
```sql
SELECT * FROM refresh_tokens
WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW();
-- Uses: idx_refresh_tokens_token
-- Frequency: Very High (every API request)
```

### Performance Bottlenecks

⚠️ **N+1 Query Problem in Application Pipeline**
- Current: Fetches applications, then loops to fetch candidate/job details
- Solution: Use JOIN queries or implement data loader pattern

⚠️ **No Full-Text Search on Candidates**
- Current: LIKE queries on name/email (slow at scale)
- Solution: Add `tsvector` column with GIN index
```sql
ALTER TABLE candidates ADD COLUMN search_vector tsvector;
CREATE INDEX idx_candidates_search ON candidates USING GIN (search_vector);
```

⚠️ **Log Table Growth**
- Current: No automatic cleanup
- Solution: Implement log rotation (already has `cleanup_old_logs()` function)
- Schedule: Daily cron job

---

## 💾 Storage Estimates

### Current Database Size (Estimated)

| Table Category | Tables | Rows (Est) | Size per Row | Total Size |
|----------------|--------|------------|--------------|------------|
| Core App | 15 | 1.1M | 2KB | 2.2 GB |
| Logging | 3 | 10M | 1KB | 10 GB |
| Infrastructure | 2 | 1K | 1KB | 1 MB |
| Licensing | 7 | 1M | 500B | 500 MB |
| **Total** | **27** | **~12M** | - | **~13 GB** |

### Future Database Size (Multi-Product)

| Table Category | Tables | Rows (Est) | Size per Row | Total Size |
|----------------|--------|------------|--------------|------------|
| Shared Core | 19 | 1.1M | 2KB | 2.2 GB |
| RecruitIQ | 7 | 1.1M | 2KB | 2.2 GB |
| Paylinq | 35 | 5M | 1KB | 5 GB |
| Nexus | 30 | 3M | 1.5KB | 4.5 GB |
| Logging | 3 | 50M | 1KB | 50 GB |
| **Total** | **94** | **~60M** | - | **~64 GB** |

**Growth Factor:** ~5x increase (acceptable for multi-product SaaS)

---

## 🔒 Data Security & Privacy

### Encryption

**At Rest:**
- PostgreSQL TDE (Transparent Data Encryption)
- Encrypt sensitive columns: `password_hash`, `mfa_secret`, `refresh_tokens.token`

**In Transit:**
- SSL/TLS for all database connections
- Certificate validation required

### PII (Personally Identifiable Information)

**Tables with PII:**
- `users` - email, name, phone
- `candidates` - email, name, phone, resume_url
- `communications` - message content

**GDPR Compliance:**
- Implement `deleted_at` soft delete (already present)
- Create anonymization procedure:
```sql
CREATE FUNCTION anonymize_user(user_uuid UUID) RETURNS void AS $$
BEGIN
  UPDATE users SET
    email = 'deleted_' || id::text || '@deleted.local',
    name = 'Deleted User',
    phone = NULL,
    avatar_url = NULL,
    deleted_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

### Audit Trail

**Existing Audit Columns:**
- `created_at`, `updated_at` - Change tracking (most tables)
- `created_by` - User attribution (most tables)
- `deleted_at` - Soft delete tracking (most tables)

**Missing Audit Columns:**
- `updated_by` - Should be added to track who made updates

---

## 📋 Migration Strategy

### Phase Approach

**Phase 1: Add Product Identifier**
```sql
-- Add product column to existing tables (no data migration needed)
ALTER TABLE jobs ADD COLUMN product VARCHAR(50) DEFAULT 'recruitiq' NOT NULL;
ALTER TABLE candidates ADD COLUMN product VARCHAR(50) DEFAULT 'recruitiq' NOT NULL;
ALTER TABLE applications ADD COLUMN product VARCHAR(50) DEFAULT 'recruitiq' NOT NULL;
-- ... etc
```

**Phase 2: Rename Tables**
```sql
-- Rename existing tables with product prefix
ALTER TABLE jobs RENAME TO recruitiq_jobs;
ALTER TABLE candidates RENAME TO recruitiq_candidates;
ALTER TABLE applications RENAME TO recruitiq_applications;
-- ... etc

-- Update foreign key references in backend code
```

**Phase 3: Create New Product Tables**
```sql
-- Create Paylinq tables (35 new tables from Phase 8)
CREATE TABLE paylinq_worker_types (...);
CREATE TABLE paylinq_pay_components (...);
-- ... etc

-- Create Nexus tables (30+ new tables from Phase 11)
CREATE TABLE nexus_employees (...);
CREATE TABLE nexus_contracts (...);
-- ... etc
```

**Phase 4: Integrate Products**
```sql
-- Link products to organizations
ALTER TABLE organizations ADD COLUMN enabled_products TEXT[] DEFAULT '{recruitiq}';

-- Example: Organization with all products
UPDATE organizations SET enabled_products = '{recruitiq,paylinq,nexus}' WHERE id = '...';
```

---

## 📊 Views & Materialized Views

### Existing Views (6)

1. **active_licenses** - Currently active licenses
2. **expiring_licenses** - Licenses expiring soon (30 days)
3. **customer_usage_summary** - Customer usage aggregates
4. **recent_errors_by_tenant** - Error count per tenant (24 hours)
5. **security_summary_by_tenant** - Security event summary per tenant
6. **active_threats** - Unresolved critical security alerts

### Recommended Materialized Views (for Performance)

```sql
-- Application pipeline summary (refresh hourly)
CREATE MATERIALIZED VIEW mv_application_pipeline AS
SELECT 
  workspace_id,
  stage,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - applied_at)) / 86400) as avg_days_in_stage
FROM applications
WHERE status = 'active'
GROUP BY workspace_id, stage;

CREATE UNIQUE INDEX idx_mv_app_pipeline ON mv_application_pipeline (workspace_id, stage);

-- Refresh schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_application_pipeline;
```

---

## 🎯 Summary & Recommendations

### Current State Assessment

✅ **Strengths:**
- Well-structured schema with clear relationships
- Proper use of foreign keys and indexes
- Soft delete support across most tables
- JSONB support for flexible data
- UUID primary keys for distributed systems
- Comprehensive audit trail (created_at, updated_at, created_by)

⚠️ **Areas for Improvement:**
- Missing full-text search indexes on candidate/job search
- No automatic log rotation (function exists but not scheduled)
- Missing `updated_by` column for complete audit trail
- N+1 query patterns in some API endpoints
- No query performance monitoring

### Multi-Product Transformation Recommendations

1. **Rename Existing Tables** - Add `recruitiq_` prefix to all ATS tables
2. **Create New Tables** - Add 65+ new tables for Paylinq and Nexus
3. **Maintain Shared Core** - Keep 19 core tables product-agnostic
4. **Add Product Column** - Track which product owns which data
5. **Update Indexes** - Add product-specific indexes where needed
6. **Implement Full-Text Search** - Add tsvector columns for search-heavy tables
7. **Set Up Log Rotation** - Schedule daily cleanup of old logs
8. **Add Query Monitoring** - Implement pg_stat_statements for performance tracking

### Next Steps

✅ **Task 1.2 Complete:** Database schema fully analyzed and documented

**Next Task (1.3):** API Endpoint Inventory - Map all 110+ existing endpoints to products

---

**Document Status:** ✅ Complete  
**Last Updated:** November 3, 2025  
**Total Tables Analyzed:** 27  
**Total Indexes Documented:** 70+  
**Total Foreign Keys:** 40+
