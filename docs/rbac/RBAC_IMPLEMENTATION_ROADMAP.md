# RBAC Implementation Roadmap

**Created:** November 21, 2025  
**Status:** Planning Phase  
**Priority:** High - Blocks 116+ failing tests

---

## Executive Summary

This roadmap addresses the critical absence of Role-Based Access Control (RBAC) in the RecruitIQ system, which is causing 116+ test failures across multiple products (PayLinQ, Nexus, ScheduleHub). The current authentication system validates user identity but lacks authorization logic to control access to resources based on user roles and permissions.

**Impact:**
- 116+ tests failing due to missing RBAC middleware
- All protected endpoints return 403 Forbidden for valid authenticated users
- Multi-tenant isolation works, but role-based permissions do not
- Blocks deployment of critical features

---

## Current State Analysis

### What Exists ✅

```javascript
// Authentication works
- JWT token generation (backend/src/middleware/auth.js)
- User identity verification
- Organization (tenant) isolation
- Session management
- Token refresh mechanism
```

### What's Missing ❌

```javascript
// Authorization does NOT work
- No role definitions in database
- No permission checks in middleware
- No role assignment to users
- No endpoint-level access control
- No product-specific permissions
```

### Test Evidence

```bash
# Sample failing test pattern
FAIL tests/products/paylinq/integration/payrollRunComponents.test.js
  ● POST /api/products/paylinq/payroll-runs/:runId/components
    Expected: 201 Created
    Actual: 403 Forbidden
    Reason: User authenticated but not authorized

# All 116+ tests share same root cause:
- User has valid JWT token ✅
- User belongs to correct organization ✅
- User lacks required role/permission ❌
```

---

## Architecture Design

### 1. Database Schema

#### A. Roles Table

```sql
-- backend/src/database/migrations/YYYYMMDDHHMMSS_create_rbac_tables.sql

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_role_name CHECK (name ~ '^[a-z_]+$')
);

-- System roles (cannot be deleted)
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access across all organizations', true),
  ('org_owner', 'Organization Owner', 'Full access within organization', true),
  ('org_admin', 'Organization Administrator', 'Administrative access within organization', true),
  ('manager', 'Manager', 'Team management and operational access', true),
  ('user', 'Standard User', 'Basic user access', true),
  ('viewer', 'Viewer', 'Read-only access', true);

-- Product-specific roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
  ('payroll_admin', 'Payroll Administrator', 'Manage payroll operations', false),
  ('payroll_processor', 'Payroll Processor', 'Process payroll runs', false),
  ('hr_admin', 'HR Administrator', 'Manage employees and HR operations', false),
  ('hr_manager', 'HR Manager', 'View and manage HR data', false),
  ('scheduler', 'Scheduler', 'Manage schedules and shifts', false);
```

#### B. Permissions Table

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,  -- e.g., 'payroll_run', 'employee'
  action VARCHAR(50) NOT NULL,     -- e.g., 'create', 'read', 'update', 'delete'
  product_slug VARCHAR(50),        -- NULL = global, else product-specific
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_permission_name CHECK (name ~ '^[a-z_:]+$'),
  CONSTRAINT check_action CHECK (action IN ('create', 'read', 'update', 'delete', 'execute', 'manage'))
);

-- Global permissions
INSERT INTO permissions (name, display_name, description, resource, action, product_slug) VALUES
  ('users:create', 'Create Users', 'Create new user accounts', 'users', 'create', NULL),
  ('users:read', 'View Users', 'View user information', 'users', 'read', NULL),
  ('users:update', 'Update Users', 'Update user information', 'users', 'update', NULL),
  ('users:delete', 'Delete Users', 'Delete user accounts', 'users', 'delete', NULL),
  ('organizations:manage', 'Manage Organization', 'Manage organization settings', 'organizations', 'manage', NULL);

-- PayLinQ permissions
INSERT INTO permissions (name, display_name, description, resource, action, product_slug) VALUES
  ('payroll_runs:create', 'Create Payroll Runs', 'Create new payroll runs', 'payroll_runs', 'create', 'paylinq'),
  ('payroll_runs:read', 'View Payroll Runs', 'View payroll run data', 'payroll_runs', 'read', 'paylinq'),
  ('payroll_runs:update', 'Update Payroll Runs', 'Update payroll runs', 'payroll_runs', 'update', 'paylinq'),
  ('payroll_runs:delete', 'Delete Payroll Runs', 'Delete payroll runs', 'payroll_runs', 'delete', 'paylinq'),
  ('payroll_runs:execute', 'Execute Payroll Runs', 'Execute/process payroll runs', 'payroll_runs', 'execute', 'paylinq'),
  ('payroll_components:manage', 'Manage Payroll Components', 'Manage payroll components', 'payroll_components', 'manage', 'paylinq'),
  ('worker_types:manage', 'Manage Worker Types', 'Manage worker types and templates', 'worker_types', 'manage', 'paylinq');

-- Nexus permissions
INSERT INTO permissions (name, display_name, description, resource, action, product_slug) VALUES
  ('employees:create', 'Create Employees', 'Create new employee records', 'employees', 'create', 'nexus'),
  ('employees:read', 'View Employees', 'View employee information', 'employees', 'read', 'nexus'),
  ('employees:update', 'Update Employees', 'Update employee records', 'employees', 'update', 'nexus'),
  ('employees:delete', 'Delete Employees', 'Delete employee records', 'employees', 'delete', 'nexus'),
  ('employees:terminate', 'Terminate Employees', 'Terminate employee contracts', 'employees', 'execute', 'nexus'),
  ('departments:manage', 'Manage Departments', 'Manage departments and structure', 'departments', 'manage', 'nexus'),
  ('locations:manage', 'Manage Locations', 'Manage office locations', 'locations', 'manage', 'nexus');

-- ScheduleHub permissions
INSERT INTO permissions (name, display_name, description, resource, action, product_slug) VALUES
  ('schedules:create', 'Create Schedules', 'Create new schedules', 'schedules', 'create', 'schedulehub'),
  ('schedules:read', 'View Schedules', 'View schedule information', 'schedules', 'read', 'schedulehub'),
  ('schedules:update', 'Update Schedules', 'Update schedules', 'schedules', 'update', 'schedulehub'),
  ('schedules:delete', 'Delete Schedules', 'Delete schedules', 'schedules', 'delete', 'schedulehub'),
  ('shifts:manage', 'Manage Shifts', 'Manage shift assignments', 'shifts', 'manage', 'schedulehub'),
  ('stations:manage', 'Manage Stations', 'Manage work stations', 'stations', 'manage', 'schedulehub');
```

#### C. Role Permissions Table

```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (role_id, permission_id)
);

-- Grant permissions to super_admin (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id
FROM permissions;

-- Grant permissions to org_owner (all non-super-admin permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'org_owner'),
  id
FROM permissions
WHERE name NOT LIKE 'system:%';

-- Grant permissions to payroll_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'payroll_admin'),
  id
FROM permissions
WHERE product_slug = 'paylinq' OR resource IN ('users', 'organizations');

-- Grant permissions to hr_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'hr_admin'),
  id
FROM permissions
WHERE product_slug = 'nexus' OR resource IN ('users', 'organizations');
```

#### D. User Roles Table

```sql
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES hris.user_account(id),
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,  -- NULL = never expires
  
  PRIMARY KEY (user_id, role_id, organization_id)
);

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

### 2. Authorization Middleware

#### A. Core RBAC Middleware

```javascript
// backend/src/middleware/rbac.js

import { query } from '../config/database.js';
import { ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * RBAC middleware - checks if user has required permission
 * @param {string|Array<string>} requiredPermission - Permission(s) required
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
export function requirePermission(requiredPermission, options = {}) {
  return async (req, res, next) => {
    try {
      const { id: userId, organizationId } = req.user;
      
      // Convert to array if single permission
      const permissions = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];

      // Check if user has any of the required permissions
      const hasPermission = await checkUserPermissions(
        userId, 
        organizationId, 
        permissions,
        options
      );

      if (!hasPermission) {
        logger.logSecurityEvent('permission_denied', {
          userId,
          organizationId,
          requiredPermissions: permissions,
          path: req.path,
          method: req.method
        });

        throw new ForbiddenError(
          `Access denied. Required permission: ${permissions.join(' or ')}`
        );
      }

      // Attach permissions to request for use in handlers
      req.userPermissions = await getUserPermissions(userId, organizationId);
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has required permissions
 */
async function checkUserPermissions(userId, organizationId, permissions, options) {
  const { requireAll = false } = options;

  const result = await query(`
    SELECT DISTINCT p.name
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = $1
      AND ur.organization_id = $2
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      AND p.name = ANY($3)
  `, [userId, organizationId, permissions]);

  if (requireAll) {
    // User must have ALL specified permissions
    return result.rows.length === permissions.length;
  } else {
    // User must have AT LEAST ONE permission
    return result.rows.length > 0;
  }
}

/**
 * Get all permissions for a user
 */
async function getUserPermissions(userId, organizationId) {
  const result = await query(`
    SELECT DISTINCT p.name, p.resource, p.action, p.product_slug
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = $1
      AND ur.organization_id = $2
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  `, [userId, organizationId]);

  return result.rows.map(row => row.name);
}

/**
 * Check if user has specific role
 */
export function requireRole(...roleNames) {
  return async (req, res, next) => {
    try {
      const { id: userId, organizationId } = req.user;

      const result = await query(`
        SELECT r.name
        FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND ur.organization_id = $2
          AND r.name = ANY($3)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        LIMIT 1
      `, [userId, organizationId, roleNames]);

      if (result.rows.length === 0) {
        logger.logSecurityEvent('role_denied', {
          userId,
          organizationId,
          requiredRoles: roleNames,
          path: req.path
        });

        throw new ForbiddenError(
          `Access denied. Required role: ${roleNames.join(' or ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Attach user permissions to request (no enforcement)
 */
export async function attachPermissions(req, res, next) {
  try {
    const { id: userId, organizationId } = req.user;
    req.userPermissions = await getUserPermissions(userId, organizationId);
    next();
  } catch (error) {
    next(error);
  }
}
```

#### B. Product-Specific RBAC

```javascript
// backend/src/products/paylinq/middleware/rbac.js

import { requirePermission, requireRole } from '../../../middleware/rbac.js';

/**
 * PayLinQ permission middleware factories
 */
export const PayLinQPermissions = {
  // Payroll Run permissions
  canCreatePayrollRun: () => requirePermission('payroll_runs:create'),
  canViewPayrollRun: () => requirePermission('payroll_runs:read'),
  canUpdatePayrollRun: () => requirePermission('payroll_runs:update'),
  canDeletePayrollRun: () => requirePermission('payroll_runs:delete'),
  canExecutePayrollRun: () => requirePermission('payroll_runs:execute'),
  
  // Component permissions
  canManageComponents: () => requirePermission('payroll_components:manage'),
  
  // Worker Type permissions
  canManageWorkerTypes: () => requirePermission('worker_types:manage'),
  
  // Role-based shortcuts
  isPayrollAdmin: () => requireRole('payroll_admin', 'org_admin', 'org_owner'),
  isPayrollProcessor: () => requireRole('payroll_processor', 'payroll_admin', 'org_admin'),
};

// Similar for Nexus and ScheduleHub
```

### 3. Route Protection

#### A. Protected Route Examples

```javascript
// backend/src/products/paylinq/routes/payrollRuns.js

import express from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { PayLinQPermissions } from '../middleware/rbac.js';
import * as payrollRunController from '../controllers/payrollRunController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// CREATE - Requires create permission
router.post('/',
  PayLinQPermissions.canCreatePayrollRun(),
  payrollRunController.createPayrollRun
);

// READ - Requires read permission
router.get('/',
  PayLinQPermissions.canViewPayrollRun(),
  payrollRunController.listPayrollRuns
);

router.get('/:id',
  PayLinQPermissions.canViewPayrollRun(),
  payrollRunController.getPayrollRun
);

// UPDATE - Requires update permission
router.patch('/:id',
  PayLinQPermissions.canUpdatePayrollRun(),
  payrollRunController.updatePayrollRun
);

// DELETE - Requires delete permission
router.delete('/:id',
  PayLinQPermissions.canDeletePayrollRun(),
  payrollRunController.deletePayrollRun
);

// EXECUTE - Requires execute permission
router.post('/:id/execute',
  PayLinQPermissions.canExecutePayrollRun(),
  payrollRunController.executePayrollRun
);

// ADD COMPONENTS - Requires manage components permission
router.post('/:runId/components',
  PayLinQPermissions.canManageComponents(),
  payrollRunController.addComponentToRun
);

export default router;
```

#### B. Dynamic Permission Checks in Controllers

```javascript
// backend/src/products/paylinq/controllers/payrollRunController.js

export async function updatePayrollRun(req, res, next) {
  try {
    const { id } = req.params;
    const { id: userId, organizationId, userPermissions } = req.user;

    // Get existing payroll run
    const run = await PayrollRunService.getById(id, organizationId);

    // Additional permission checks based on run state
    if (run.status === 'finalized' && !userPermissions.includes('payroll_runs:manage_finalized')) {
      throw new ForbiddenError('Cannot modify finalized payroll run');
    }

    // Proceed with update
    const updated = await PayrollRunService.update(id, req.body, organizationId, userId);

    res.json({
      success: true,
      payrollRun: updated
    });
  } catch (error) {
    next(error);
  }
}
```

---

## Implementation Plan

### Phase 1: Database Setup (2-3 hours)

**Tasks:**
1. ✅ Create migration file for RBAC tables
2. ✅ Run migration on test database
3. ✅ Seed default roles and permissions
4. ✅ Assign roles to existing test users

**Files to Create:**
- `backend/src/database/migrations/20251121_create_rbac_tables.sql`
- `backend/src/database/seeds/rbac_seed.sql`

**Validation:**
```sql
-- Verify tables created
SELECT * FROM roles;
SELECT * FROM permissions;
SELECT * FROM role_permissions;
SELECT * FROM user_roles;

-- Verify test user has roles
SELECT u.email, r.name as role
FROM hris.user_account u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE u.email = 'tenant@testcompany.com';
```

### Phase 2: Core Middleware (3-4 hours)

**Tasks:**
1. ✅ Create `backend/src/middleware/rbac.js`
2. ✅ Implement `requirePermission()` middleware
3. ✅ Implement `requireRole()` middleware
4. ✅ Implement `checkUserPermissions()` helper
5. ✅ Add unit tests for RBAC middleware

**Files to Create:**
- `backend/src/middleware/rbac.js`
- `backend/tests/unit/middleware/rbac.test.js`

**Validation:**
```bash
npm test -- rbac.test.js
```

### Phase 3: Product-Specific RBAC (4-5 hours)

**Tasks:**
1. ✅ Create PayLinQ RBAC middleware
2. ✅ Create Nexus RBAC middleware
3. ✅ Create ScheduleHub RBAC middleware
4. ✅ Update product routes to use RBAC

**Files to Create:**
- `backend/src/products/paylinq/middleware/rbac.js`
- `backend/src/products/nexus/middleware/rbac.js`
- `backend/src/products/schedulehub/middleware/rbac.js`

**Files to Update:**
- All route files in `backend/src/products/*/routes/`

### Phase 4: Test Fixes (6-8 hours)

**Tasks:**
1. ✅ Update test helpers to assign roles
2. ✅ Fix failing PayLinQ tests (52 tests)
3. ✅ Fix failing Nexus tests (42 tests)
4. ✅ Fix failing ScheduleHub tests (22 tests)
5. ✅ Run full test suite

**Files to Update:**
- `backend/tests/helpers/auth.js` - Add role assignment
- All test files with 403 errors

**Test Helper Update:**
```javascript
// backend/tests/helpers/auth.js

export async function createTestUserWithRole(userData, roleName) {
  const user = await createTestUser(userData);
  
  // Assign role
  await pool.query(`
    INSERT INTO user_roles (user_id, role_id, organization_id)
    SELECT $1, r.id, $2
    FROM roles r
    WHERE r.name = $3
  `, [user.id, userData.organizationId, roleName]);
  
  return user;
}

export async function generateTestTokenWithRole(user, roleName) {
  await assignRoleToUser(user.id, roleName, user.organizationId);
  return generateTestToken(user);
}
```

### Phase 5: Integration & Validation (2-3 hours)

**Tasks:**
1. ✅ Run full integration test suite
2. ✅ Verify all 116 tests pass
3. ✅ Test permission denial scenarios
4. ✅ Update API documentation
5. ✅ Create RBAC usage guide

**Validation Commands:**
```bash
# Run all tests
npm test

# Run product-specific tests
npm test -- tests/products/paylinq/
npm test -- tests/products/nexus/
npm test -- tests/products/schedulehub/

# Check coverage
npm test -- --coverage
```

---

## Migration Strategy

### For Existing Users

```sql
-- Assign default role to all existing users
INSERT INTO user_roles (user_id, role_id, organization_id, granted_at)
SELECT 
  u.id,
  (SELECT id FROM roles WHERE name = 'org_admin'),
  u.organization_id,
  NOW()
FROM hris.user_account u
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = u.id 
    AND ur.organization_id = u.organization_id
);
```

### For Test Users

```javascript
// backend/tests/helpers/setupTestRoles.js

export async function setupTestUsersWithRoles() {
  const testUsers = [
    { email: 'tenant@testcompany.com', role: 'org_admin' },
    { email: 'tenant2@testcompany2.com', role: 'org_admin' },
    { email: 'payroll@testcompany.com', role: 'payroll_admin' },
    { email: 'hr@testcompany.com', role: 'hr_admin' },
  ];

  for (const userData of testUsers) {
    await assignRoleToUserByEmail(userData.email, userData.role);
  }
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// backend/tests/unit/middleware/rbac.test.js

describe('RBAC Middleware', () => {
  describe('requirePermission', () => {
    it('should allow access with required permission', async () => {
      // User has 'payroll_runs:create' permission
      const middleware = requirePermission('payroll_runs:create');
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(); // No error
    });

    it('should deny access without required permission', async () => {
      // User lacks permission
      const middleware = requirePermission('payroll_runs:delete');
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should allow access with any of multiple permissions', async () => {
      // User has one of the required permissions
      const middleware = requirePermission(['perm1', 'perm2', 'perm3']);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
```

### Integration Tests

```javascript
// backend/tests/products/paylinq/integration/rbac.test.js

describe('PayLinQ RBAC Integration', () => {
  it('should allow payroll admin to create payroll run', async () => {
    const token = await generateTestTokenWithRole(user, 'payroll_admin');
    
    const response = await request(app)
      .post('/api/products/paylinq/payroll-runs')
      .set('Authorization', `Bearer ${token}`)
      .send(payrollRunData)
      .expect(201);

    expect(response.body.success).toBe(true);
  });

  it('should deny viewer from creating payroll run', async () => {
    const token = await generateTestTokenWithRole(user, 'viewer');
    
    await request(app)
      .post('/api/products/paylinq/payroll-runs')
      .set('Authorization', `Bearer ${token}`)
      .send(payrollRunData)
      .expect(403);
  });
});
```

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Add RBAC gradually, starting with non-critical endpoints
- Keep comprehensive test coverage
- Use feature flags for RBAC rollout
- Maintain backward compatibility period

### Risk 2: Performance Impact
**Mitigation:**
- Cache user permissions in JWT token payload
- Use database indexes on user_roles and role_permissions
- Implement Redis caching for permission checks
- Monitor query performance

### Risk 3: Complex Permission Management
**Mitigation:**
- Provide UI for role/permission management (admin panel)
- Create sensible default roles
- Document permission model clearly
- Provide CLI tools for bulk operations

---

## Success Criteria

✅ **All 116 failing tests pass**
✅ **No regression in existing passing tests**
✅ **Permission checks enforce correctly (403 for unauthorized)**
✅ **Test execution time increase < 10%**
✅ **Zero breaking changes to API contracts**
✅ **Documentation complete and accurate**

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Database Setup | 2-3 hours | None |
| Phase 2: Core Middleware | 3-4 hours | Phase 1 |
| Phase 3: Product RBAC | 4-5 hours | Phase 2 |
| Phase 4: Test Fixes | 6-8 hours | Phase 3 |
| Phase 5: Integration | 2-3 hours | Phase 4 |
| **Total** | **17-23 hours** | Sequential |

**Recommended Approach:** Implement over 3 days with continuous testing and validation.

---

## Next Steps

1. **Immediate:** Review and approve this roadmap
2. **Day 1:** Implement Phases 1-2 (Database + Core Middleware)
3. **Day 2:** Implement Phase 3 (Product-Specific RBAC)
4. **Day 3:** Implement Phases 4-5 (Test Fixes + Validation)

**Ready to proceed with Phase 1: Database Setup?**
