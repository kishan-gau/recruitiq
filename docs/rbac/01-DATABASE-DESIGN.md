# Database Design - Centralized RBAC System

**Part of:** [RBAC Implementation Plan](./00-OVERVIEW.md)  
**Version:** 1.0  
**Date:** November 21, 2025

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Table Definitions](#table-definitions)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Migration Scripts](#migration-scripts)
6. [Seed Data](#seed-data)
7. [Backward Compatibility](#backward-compatibility)

---

## Schema Overview

### Database Structure

```
┌─────────────────────────────────────────────────────────┐
│                   RBAC Schema                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  organizations (existing)                                │
│       │                                                  │
│       ├──→ roles (NEW)                                   │
│       │      ├──→ role_permissions (NEW)                 │
│       │      │         └──→ permissions (NEW)            │
│       │      │                                           │
│       │      └──→ user_roles (NEW)                       │
│       │                 └──→ hris.user_account (existing)│
│       │                                                  │
│       └──→ hris.user_account (existing)                  │
│              └──→ employees (existing, optional link)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Organization-Scoped**: All roles are scoped to organizations (multi-tenancy)
2. **Product-Aware**: Permissions categorized by product (paylinq, nexus, recruitiq, global)
3. **Flexible Roles**: Roles can be global or product-specific
4. **System vs Custom**: Differentiate between system-defined and user-defined entities
5. **Audit Trail**: Track who created/assigned what and when
6. **Soft Deletes**: Use `deleted_at` for roles (permissions are immutable)

---

## Table Definitions

### 1. `permissions` Table

System-defined permissions for all products. Immutable (managed by system only).

```sql
CREATE TABLE IF NOT EXISTS permissions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Permission Details
  code VARCHAR(100) UNIQUE NOT NULL,           -- e.g., "payroll:run:create"
  name VARCHAR(200) NOT NULL,                  -- e.g., "Create Payroll Run"
  description TEXT,                            -- Human-readable description
  
  -- Categorization
  product VARCHAR(50) NOT NULL,                -- 'paylinq', 'nexus', 'recruitiq', 'global'
  category VARCHAR(100),                       -- 'payroll', 'employees', 'reports', 'admin'
  
  -- System Flag
  is_system BOOLEAN NOT NULL DEFAULT true,     -- System permissions cannot be deleted
  
  -- Metadata
  display_order INTEGER DEFAULT 0,             -- For UI sorting
  is_active BOOLEAN NOT NULL DEFAULT true,     -- Enable/disable permission
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_permissions_product CHECK (
    product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq', 'global')
  )
);

-- Comments
COMMENT ON TABLE permissions IS 'System-defined permissions for all products';
COMMENT ON COLUMN permissions.code IS 'Unique permission code (e.g., payroll:run:create)';
COMMENT ON COLUMN permissions.product IS 'Product this permission belongs to';
COMMENT ON COLUMN permissions.category IS 'Permission category for grouping in UI';
```

### 2. `roles` Table

Organization-scoped roles with optional product specificity.

```sql
CREATE TABLE IF NOT EXISTS roles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization Scope
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role Details
  name VARCHAR(100) NOT NULL,                  -- e.g., "Payroll Administrator"
  description TEXT,                            -- Role purpose and responsibilities
  
  -- Product Context (optional)
  product VARCHAR(50),                         -- NULL = global role, or specific product
  
  -- System Flag
  is_system BOOLEAN NOT NULL DEFAULT false,    -- System roles cannot be edited/deleted
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,     -- Enable/disable role
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,                        -- Soft delete
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  UNIQUE(organization_id, name, product),      -- Unique role name per org+product
  CONSTRAINT check_roles_product CHECK (
    product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq')
  )
);

-- Comments
COMMENT ON TABLE roles IS 'Organization-scoped roles with permissions';
COMMENT ON COLUMN roles.product IS 'Product-specific role (NULL for global roles)';
COMMENT ON COLUMN roles.is_system IS 'System roles are pre-defined and cannot be deleted';
```

### 3. `role_permissions` Table

Many-to-many relationship between roles and permissions.

```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  -- Composite Primary Key
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  
  -- Primary Key
  PRIMARY KEY (role_id, permission_id)
);

-- Comments
COMMENT ON TABLE role_permissions IS 'Assigns permissions to roles';
```

### 4. `user_roles` Table

Assigns roles to users with product context.

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  -- Composite Key
  user_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  
  -- Product Context (optional)
  product VARCHAR(50),                         -- Product context for assignment
  
  -- Audit
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES hris.user_account(id),
  revoked_at TIMESTAMP,                        -- Soft revoke
  revoked_by UUID REFERENCES hris.user_account(id),
  
  -- Primary Key (user can have same role in different products)
  PRIMARY KEY (user_id, role_id, COALESCE(product, '')),
  
  -- Constraints
  CONSTRAINT check_user_roles_product CHECK (
    product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq')
  )
);

-- Comments
COMMENT ON TABLE user_roles IS 'Assigns roles to users with product context';
COMMENT ON COLUMN user_roles.product IS 'Product context for role assignment';
COMMENT ON COLUMN user_roles.revoked_at IS 'Soft delete - allows role history';
```

### 5. `role_audit_log` Table (Optional - Enhanced Audit)

Detailed audit trail for role/permission changes.

```sql
CREATE TABLE IF NOT EXISTS role_audit_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Audit Context
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type VARCHAR(50) NOT NULL,            -- 'role', 'permission', 'user_role'
  entity_id UUID NOT NULL,                     -- ID of the entity changed
  action VARCHAR(50) NOT NULL,                 -- 'create', 'update', 'delete', 'assign', 'revoke'
  
  -- Change Details
  changes JSONB,                               -- Before/after values
  
  -- User Context
  performed_by UUID REFERENCES hris.user_account(id),
  ip_address INET,                             -- IP address of user
  user_agent TEXT,                             -- Browser/client info
  
  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_audit_entity_type CHECK (
    entity_type IN ('role', 'permission', 'role_permission', 'user_role')
  ),
  CONSTRAINT check_audit_action CHECK (
    action IN ('create', 'update', 'delete', 'assign', 'revoke', 'activate', 'deactivate')
  )
);

-- Comments
COMMENT ON TABLE role_audit_log IS 'Audit trail for all RBAC changes';
```

---

## Relationships

### Entity Relationship Diagram

```
organizations (1) ──────── (∞) roles
                              │
                              ├─── (∞) role_permissions ──── (1) permissions
                              │
                              └─── (∞) user_roles ──── (1) hris.user_account
                                                           │
                                                           └─── (0..1) employees
```

### Relationship Details

| From Table | To Table | Type | Cascade | Description |
|------------|----------|------|---------|-------------|
| roles | organizations | N:1 | CASCADE | Roles belong to organizations |
| role_permissions | roles | N:1 | CASCADE | Delete role → delete its permissions |
| role_permissions | permissions | N:1 | CASCADE | Delete permission → remove from roles |
| user_roles | hris.user_account | N:1 | CASCADE | Delete user → delete role assignments |
| user_roles | roles | N:1 | CASCADE | Delete role → remove user assignments |

---

## Indexes

### Primary Indexes (Auto-created)

```sql
-- Primary keys automatically indexed
-- permissions.id
-- roles.id
-- role_permissions (role_id, permission_id)
-- user_roles (user_id, role_id, product)
```

### Secondary Indexes (Performance Critical)

```sql
-- Roles: Filter by organization and product
CREATE INDEX idx_roles_organization 
ON roles(organization_id) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_roles_product 
ON roles(product) 
WHERE deleted_at IS NULL AND product IS NOT NULL;

CREATE INDEX idx_roles_active 
ON roles(organization_id, is_active) 
WHERE deleted_at IS NULL;

-- Permissions: Filter by product and category
CREATE INDEX idx_permissions_product 
ON permissions(product) 
WHERE is_active = true;

CREATE INDEX idx_permissions_category 
ON permissions(product, category) 
WHERE is_active = true;

CREATE INDEX idx_permissions_code 
ON permissions(code);  -- Already unique, but explicit index

-- Role Permissions: Fast permission lookup for role
CREATE INDEX idx_role_permissions_role 
ON role_permissions(role_id);

CREATE INDEX idx_role_permissions_permission 
ON role_permissions(permission_id);

-- User Roles: Fast user permission lookup
CREATE INDEX idx_user_roles_user 
ON user_roles(user_id) 
WHERE revoked_at IS NULL;

CREATE INDEX idx_user_roles_role 
ON user_roles(role_id) 
WHERE revoked_at IS NULL;

CREATE INDEX idx_user_roles_product 
ON user_roles(user_id, product) 
WHERE revoked_at IS NULL;

-- Audit Log: Query by organization and date
CREATE INDEX idx_role_audit_log_org_date 
ON role_audit_log(organization_id, created_at DESC);

CREATE INDEX idx_role_audit_log_entity 
ON role_audit_log(entity_type, entity_id);

CREATE INDEX idx_role_audit_log_user 
ON role_audit_log(performed_by, created_at DESC);
```

### Index Rationale

| Index | Query Pattern | Frequency |
|-------|---------------|-----------|
| `idx_roles_organization` | List roles for organization | Very High |
| `idx_roles_product` | Filter roles by product | High |
| `idx_permissions_product` | Get permissions for product | High |
| `idx_user_roles_user` | Get user's roles/permissions | Very High |
| `idx_user_roles_product` | Check user access to product | Very High |

---

## Migration Scripts

### Migration 001: Create RBAC Tables

```sql
-- Migration: 20251121000001_create_rbac_tables.sql
-- Description: Creates core RBAC tables for centralized IAM system
-- Author: RecruitIQ Team
-- Date: 2025-11-21

-- === UP Migration ===

BEGIN;

-- 1. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  product VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  is_system BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_permissions_product CHECK (
    product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq', 'global')
  )
);

-- 2. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  product VARCHAR(50),
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  UNIQUE(organization_id, name, product),
  CONSTRAINT check_roles_product CHECK (
    product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq')
  )
);

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  product VARCHAR(50),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES hris.user_account(id),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES hris.user_account(id),
  PRIMARY KEY (user_id, role_id, COALESCE(product, '')),
  CONSTRAINT check_user_roles_product CHECK (
    product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq')
  )
);

-- 5. Create audit log table
CREATE TABLE IF NOT EXISTS role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES hris.user_account(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_audit_entity_type CHECK (
    entity_type IN ('role', 'permission', 'role_permission', 'user_role')
  ),
  CONSTRAINT check_audit_action CHECK (
    action IN ('create', 'update', 'delete', 'assign', 'revoke', 'activate', 'deactivate')
  )
);

-- 6. Create indexes
CREATE INDEX idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_roles_product ON roles(product) WHERE deleted_at IS NULL AND product IS NOT NULL;
CREATE INDEX idx_roles_active ON roles(organization_id, is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_permissions_product ON permissions(product) WHERE is_active = true;
CREATE INDEX idx_permissions_category ON permissions(product, category) WHERE is_active = true;
CREATE INDEX idx_permissions_code ON permissions(code);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_product ON user_roles(user_id, product) WHERE revoked_at IS NULL;

CREATE INDEX idx_role_audit_log_org_date ON role_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_role_audit_log_entity ON role_audit_log(entity_type, entity_id);
CREATE INDEX idx_role_audit_log_user ON role_audit_log(performed_by, created_at DESC);

-- 7. Add comments
COMMENT ON TABLE permissions IS 'System-defined permissions for all products';
COMMENT ON TABLE roles IS 'Organization-scoped roles with permissions';
COMMENT ON TABLE role_permissions IS 'Assigns permissions to roles';
COMMENT ON TABLE user_roles IS 'Assigns roles to users with product context';
COMMENT ON TABLE role_audit_log IS 'Audit trail for all RBAC changes';

COMMIT;

-- === DOWN Migration ===

BEGIN;

DROP TABLE IF EXISTS role_audit_log CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

COMMIT;
```

### Migration 002: Seed System Permissions

See [Seed Data](#seed-data) section below.

---

## Seed Data

### System Permissions Seed Script

```sql
-- Migration: 20251121000002_seed_system_permissions.sql
-- Description: Seeds system-defined permissions for all products
-- Author: RecruitIQ Team
-- Date: 2025-11-21

BEGIN;

-- === GLOBAL PERMISSIONS ===

INSERT INTO permissions (code, name, description, product, category, display_order) VALUES
-- User Management
('user:view', 'View Users', 'View user accounts and profiles', 'global', 'user_management', 1),
('user:create', 'Create Users', 'Create new user accounts', 'global', 'user_management', 2),
('user:edit', 'Edit Users', 'Modify user account details', 'global', 'user_management', 3),
('user:delete', 'Delete Users', 'Delete or deactivate user accounts', 'global', 'user_management', 4),
('user:reset_password', 'Reset User Passwords', 'Reset passwords for user accounts', 'global', 'user_management', 5),

-- RBAC Management
('rbac:view', 'View Roles & Permissions', 'View roles and permission assignments', 'global', 'rbac', 10),
('rbac:manage', 'Manage Roles & Permissions', 'Create, edit, delete roles and assign permissions', 'global', 'rbac', 11),
('rbac:assign', 'Assign Roles to Users', 'Assign or revoke user roles', 'global', 'rbac', 12),

-- Organization Settings
('org:settings:view', 'View Organization Settings', 'View organization configuration', 'global', 'organization', 20),
('org:settings:edit', 'Edit Organization Settings', 'Modify organization settings', 'global', 'organization', 21);

-- === PAYLINQ PERMISSIONS ===

INSERT INTO permissions (code, name, description, product, category, display_order) VALUES
-- Payroll Runs
('payroll:run:view', 'View Payroll Runs', 'View payroll run details', 'paylinq', 'payroll_runs', 100),
('payroll:run:create', 'Create Payroll Runs', 'Create new payroll runs', 'paylinq', 'payroll_runs', 101),
('payroll:run:edit', 'Edit Payroll Runs', 'Modify payroll run details', 'paylinq', 'payroll_runs', 102),
('payroll:run:approve', 'Approve Payroll Runs', 'Approve payroll runs for processing', 'paylinq', 'payroll_runs', 103),
('payroll:run:process', 'Process Payroll Runs', 'Execute payroll processing', 'paylinq', 'payroll_runs', 104),
('payroll:run:delete', 'Delete Payroll Runs', 'Delete draft payroll runs', 'paylinq', 'payroll_runs', 105),

-- Pay Components
('payroll:component:view', 'View Pay Components', 'View pay component definitions', 'paylinq', 'components', 110),
('payroll:component:manage', 'Manage Pay Components', 'Create, edit, delete pay components', 'paylinq', 'components', 111),

-- Workers
('payroll:worker:view', 'View Workers', 'View worker payroll information', 'paylinq', 'workers', 120),
('payroll:worker:edit', 'Edit Workers', 'Modify worker payroll details', 'paylinq', 'workers', 121),

-- Time Entries
('payroll:time:view', 'View Time Entries', 'View time entry records', 'paylinq', 'time_entries', 130),
('payroll:time:approve', 'Approve Time Entries', 'Approve or reject time entries', 'paylinq', 'time_entries', 131),

-- Reports
('payroll:reports:view', 'View Payroll Reports', 'Access payroll reports and analytics', 'paylinq', 'reports', 140),
('payroll:reports:export', 'Export Payroll Data', 'Export payroll data and reports', 'paylinq', 'reports', 141),

-- Settings
('payroll:settings:view', 'View Payroll Settings', 'View payroll configuration', 'paylinq', 'settings', 150),
('payroll:settings:manage', 'Manage Payroll Settings', 'Modify payroll system settings', 'paylinq', 'settings', 151);

-- === NEXUS PERMISSIONS ===

INSERT INTO permissions (code, name, description, product, category, display_order) VALUES
-- Employees
('employee:view', 'View Employees', 'View employee profiles and details', 'nexus', 'employees', 200),
('employee:create', 'Create Employees', 'Add new employee records', 'nexus', 'employees', 201),
('employee:edit', 'Edit Employees', 'Modify employee information', 'nexus', 'employees', 202),
('employee:terminate', 'Terminate Employees', 'Terminate employee contracts', 'nexus', 'employees', 203),
('employee:delete', 'Delete Employees', 'Delete employee records', 'nexus', 'employees', 204),

-- Attendance
('attendance:view', 'View Attendance', 'View attendance records', 'nexus', 'attendance', 210),
('attendance:record', 'Record Attendance', 'Clock in/out and record attendance', 'nexus', 'attendance', 211),
('attendance:approve', 'Approve Attendance', 'Approve attendance corrections', 'nexus', 'attendance', 212),

-- Time Off
('timeoff:view', 'View Time Off Requests', 'View time off request records', 'nexus', 'time_off', 220),
('timeoff:request', 'Request Time Off', 'Submit time off requests', 'nexus', 'time_off', 221),
('timeoff:approve', 'Approve Time Off', 'Approve or reject time off requests', 'nexus', 'time_off', 222),

-- Benefits
('benefits:view', 'View Benefits', 'View benefit plans and enrollments', 'nexus', 'benefits', 230),
('benefits:enroll', 'Enroll in Benefits', 'Enroll employees in benefit plans', 'nexus', 'benefits', 231),
('benefits:manage', 'Manage Benefits', 'Create and manage benefit plans', 'nexus', 'benefits', 232),

-- Documents
('documents:view', 'View Documents', 'View employee documents', 'nexus', 'documents', 240),
('documents:upload', 'Upload Documents', 'Upload employee documents', 'nexus', 'documents', 241),
('documents:delete', 'Delete Documents', 'Delete employee documents', 'nexus', 'documents', 242),

-- Departments & Locations
('dept:view', 'View Departments', 'View department information', 'nexus', 'organization', 250),
('dept:manage', 'Manage Departments', 'Create, edit, delete departments', 'nexus', 'organization', 251),
('location:view', 'View Locations', 'View office locations', 'nexus', 'organization', 252),
('location:manage', 'Manage Locations', 'Create, edit, delete locations', 'nexus', 'organization', 253),

-- Performance
('performance:view', 'View Performance Reviews', 'View performance review data', 'nexus', 'performance', 260),
('performance:manage', 'Manage Performance Reviews', 'Create and conduct performance reviews', 'nexus', 'performance', 261),

-- Reports
('hris:reports:view', 'View HR Reports', 'Access HR reports and analytics', 'nexus', 'reports', 270),
('hris:reports:export', 'Export HR Data', 'Export HR data and reports', 'nexus', 'reports', 271);

-- === RECRUITIQ PERMISSIONS ===

INSERT INTO permissions (code, name, description, product, category, display_order) VALUES
-- Jobs
('job:view', 'View Jobs', 'View job postings', 'recruitiq', 'jobs', 300),
('job:create', 'Create Jobs', 'Create new job postings', 'recruitiq', 'jobs', 301),
('job:edit', 'Edit Jobs', 'Modify job posting details', 'recruitiq', 'jobs', 302),
('job:publish', 'Publish Jobs', 'Publish jobs to public', 'recruitiq', 'jobs', 303),
('job:close', 'Close Jobs', 'Close job postings', 'recruitiq', 'jobs', 304),
('job:delete', 'Delete Jobs', 'Delete job postings', 'recruitiq', 'jobs', 305),

-- Candidates
('candidate:view', 'View Candidates', 'View candidate profiles', 'recruitiq', 'candidates', 310),
('candidate:edit', 'Edit Candidates', 'Modify candidate information', 'recruitiq', 'candidates', 311),
('candidate:delete', 'Delete Candidates', 'Delete candidate records', 'recruitiq', 'candidates', 312),

-- Applications
('application:view', 'View Applications', 'View job applications', 'recruitiq', 'applications', 320),
('application:review', 'Review Applications', 'Review and update application status', 'recruitiq', 'applications', 321),
('application:reject', 'Reject Applications', 'Reject applications', 'recruitiq', 'applications', 322),

-- Interviews
('interview:view', 'View Interviews', 'View interview schedules', 'recruitiq', 'interviews', 330),
('interview:schedule', 'Schedule Interviews', 'Schedule candidate interviews', 'recruitiq', 'interviews', 331),
('interview:conduct', 'Conduct Interviews', 'Conduct and provide interview feedback', 'recruitiq', 'interviews', 332),

-- Reports
('ats:reports:view', 'View Recruitment Reports', 'Access recruitment reports', 'recruitiq', 'reports', 340),
('ats:reports:export', 'Export Recruitment Data', 'Export recruitment data', 'recruitiq', 'reports', 341);

-- === SCHEDULEHUB PERMISSIONS ===

INSERT INTO permissions (code, name, description, product, category, display_order) VALUES
-- Schedules
('schedule:view', 'View Schedules', 'View shift schedules', 'schedulehub', 'schedules', 400),
('schedule:create', 'Create Schedules', 'Create new shift schedules', 'schedulehub', 'schedules', 401),
('schedule:edit', 'Edit Schedules', 'Modify shift assignments', 'schedulehub', 'schedules', 402),
('schedule:publish', 'Publish Schedules', 'Publish schedules to employees', 'schedulehub', 'schedules', 403),

-- Stations
('station:view', 'View Stations', 'View station information', 'schedulehub', 'stations', 410),
('station:manage', 'Manage Stations', 'Create, edit, delete stations', 'schedulehub', 'stations', 411),

-- Shifts
('shift:view', 'View Shifts', 'View shift information', 'schedulehub', 'shifts', 420),
('shift:swap', 'Swap Shifts', 'Request or approve shift swaps', 'schedulehub', 'shifts', 421),

-- Reports
('scheduling:reports:view', 'View Schedule Reports', 'Access scheduling reports', 'schedulehub', 'reports', 430);

COMMIT;
```

---

## Backward Compatibility

### Coexistence Strategy

The new RBAC system will coexist with the current `product_roles` JSONB field:

```sql
-- Current user structure (no changes)
hris.user_account {
  id,
  email,
  enabled_products: text[],           -- Still used for product access
  product_roles: jsonb,               -- Gradually deprecated
  ...
}
```

### Migration Path

1. **Phase 1**: Create new RBAC tables (no impact on existing system)
2. **Phase 2**: Populate roles from `product_roles` data
3. **Phase 3**: Run both systems in parallel (read from both)
4. **Phase 4**: Switch permission checks to new system
5. **Phase 5**: Deprecate `product_roles` field (keep for backward compat)

### Fallback Logic

```javascript
// Permission check with fallback
async function hasPermission(userId, permissionCode) {
  // Try new RBAC system first
  const hasNew = await checkRBACPermission(userId, permissionCode);
  if (hasNew !== null) return hasNew;
  
  // Fallback to product_roles
  return checkLegacyProductRole(userId, permissionCode);
}
```

---

**Next:** [02-BACKEND-IMPLEMENTATION.md](./02-BACKEND-IMPLEMENTATION.md)
