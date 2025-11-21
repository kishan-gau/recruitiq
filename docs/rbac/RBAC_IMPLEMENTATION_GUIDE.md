# RBAC Implementation Guide

**Part of:** [RecruitIQ Coding Standards](./CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [RBAC Overview](#rbac-overview)
2. [Architecture](#architecture)
3. [Permission System](#permission-system)
4. [Role Definitions](#role-definitions)
5. [Middleware Usage](#middleware-usage)
6. [Database Schema](#database-schema)
7. [Implementation Examples](#implementation-examples)
8. [Testing Standards](#testing-standards)
9. [Migration Guide](#migration-guide)

---

## RBAC Overview

### What is RBAC?

**Role-Based Access Control (RBAC)** is a security model that restricts system access based on user roles. RecruitIQ implements a **hierarchical RBAC system** with two separate contexts:

1. **Platform RBAC** - For portal/admin users managing the platform
2. **Tenant RBAC** - For organization users with product-specific roles

### Key Concepts

```
User → Role → Permissions → Resources

User:        Individual authenticated user
Role:        Named set of permissions (e.g., "Admin", "Recruiter")
Permissions: Granular access rights (e.g., "jobs.create", "jobs.delete")
Resources:   Protected endpoints/features (e.g., POST /api/jobs)
```

### Why RBAC?

✅ **Security** - Principle of least privilege  
✅ **Scalability** - Easy to add new roles/permissions  
✅ **Maintainability** - Centralized permission management  
✅ **Auditability** - Track who has access to what  
✅ **Flexibility** - Fine-grained control per resource  

---

## Architecture

### Dual-Context RBAC System

RecruitIQ uses **two separate RBAC contexts** that must never overlap:

```
┌─────────────────────────────────────────────────────────┐
│                   PLATFORM CONTEXT                      │
│  (Portal/Admin - Manages the SaaS Platform)            │
│                                                         │
│  Middleware: authenticatePlatform                      │
│  Database:   hris.platform_user (role, permissions)   │
│  Token Type: 'platform'                                │
│  Cookie:     platform_access_token                     │
│                                                         │
│  Roles:                                                │
│    - super_admin     (all permissions)                 │
│    - platform_admin  (platform management)             │
│    - support         (read-only support access)        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   TENANT CONTEXT                        │
│  (Organization Users - Product Applications)            │
│                                                         │
│  Middleware: authenticateTenant                        │
│  Database:   hris.user_account (product_roles)         │
│  Token Type: 'tenant'                                  │
│  Cookie:     tenant_access_token                       │
│                                                         │
│  Products:                                             │
│    - nexus       (HRIS)                                │
│    - paylinq     (Payroll)                             │
│    - schedulehub (Scheduling)                          │
│    - recruitiq   (Recruitment)                         │
│                                                         │
│  Per-Product Roles:                                    │
│    - admin       (full product access)                 │
│    - manager     (team management)                     │
│    - user        (standard access)                     │
│    - viewer      (read-only)                           │
└─────────────────────────────────────────────────────────┘
```

### Token Type Enforcement (CRITICAL)

**EVERY authenticated endpoint MUST verify token type matches the context:**

```javascript
// ✅ CORRECT: Platform endpoint
router.post('/api/admin/customers',
  authenticatePlatform,           // Requires type: 'platform'
  requirePlatformRole('admin'),
  createCustomer
);

// ✅ CORRECT: Tenant endpoint
router.post('/api/products/nexus/employees',
  authenticateTenant,              // Requires type: 'tenant'
  requireProductAccess('nexus'),
  createEmployee
);

// ❌ WRONG: No authentication
router.post('/api/admin/customers', createCustomer); // Vulnerable!

// ❌ WRONG: Wrong middleware for context
router.post('/api/admin/customers',
  authenticateTenant,  // Wrong! Should be authenticatePlatform
  createCustomer
);
```

---

## Permission System

### Permission Naming Convention

```
{resource}.{action}

Examples:
jobs.create          - Create job postings
jobs.update          - Update job postings
jobs.delete          - Delete job postings
jobs.view            - View job postings
candidates.export    - Export candidate data
reports.generate     - Generate reports
settings.manage      - Manage system settings
```

### Permission Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Platform Permissions (Portal/Admin)                     │
└─────────────────────────────────────────────────────────┘

portal.*                 - All portal permissions
  portal.view            - Access portal dashboard
  portal.manage          - Manage portal settings

license.*                - All license permissions
  license.view           - View licenses
  license.manage         - Manage licenses
  license.tiers.manage   - Manage tier definitions

customers.*              - All customer permissions
  customers.view         - View customer list
  customers.create       - Create new customers
  customers.update       - Update customer details
  customers.delete       - Delete customers

users.*                  - All user permissions
  users.view             - View user list
  users.create           - Create platform users
  users.update           - Update user details
  users.delete           - Delete users
  users.permissions      - Manage user permissions

security.*               - All security permissions
  security.dashboard     - View security dashboard
  security.alerts        - Manage security alerts
  security.audit         - Access audit logs

┌─────────────────────────────────────────────────────────┐
│ Product Permissions (Tenant Context)                    │
└─────────────────────────────────────────────────────────┘

Per Product (nexus, paylinq, schedulehub, recruitiq):

{product}.employees.*    - Employee management
{product}.payroll.*      - Payroll operations
{product}.reports.*      - Report generation
{product}.settings.*     - Product settings
```

### Permission Inheritance

```javascript
// Super admin gets ALL permissions automatically
if (user.role === 'super_admin') {
  return next(); // Bypass permission checks
}

// Permission wildcards supported
'jobs.*'           // All job permissions
'candidates.*'     // All candidate permissions
'reports.*.view'   // View all report types
```

---

## Role Definitions

### Platform Roles (Portal/Admin)

| Role | Description | Permissions | Use Case |
|------|-------------|-------------|----------|
| **super_admin** | System superuser | ALL permissions | Platform development, emergency access |
| **platform_admin** | Platform administrator | portal.*, license.*, customers.* | Day-to-day platform management |
| **support** | Support team member | portal.view, customers.view, security.dashboard | Customer support |
| **security_admin** | Security specialist | security.*, users.view, portal.view | Security monitoring |

### Tenant Roles (Product Context)

**Per-Product Roles** (user can have different roles in different products):

| Role | Description | Permissions | Use Case |
|------|-------------|-------------|----------|
| **admin** | Product administrator | All product features | Organization admin |
| **manager** | Team manager | Manage team resources, view reports | Department manager |
| **user** | Standard user | Create/update own resources | Standard employee |
| **viewer** | Read-only access | View-only access | Auditor, observer |

### Role Assignment Examples

```javascript
// Platform user (portal)
{
  id: 'uuid',
  email: 'admin@recruitiq.com',
  role: 'platform_admin',
  permissions: [
    'portal.view',
    'portal.manage',
    'license.view',
    'license.manage',
    'customers.view',
    'customers.create'
  ],
  type: 'platform'
}

// Tenant user (organization)
{
  id: 'uuid',
  email: 'user@company.com',
  organizationId: 'org-uuid',
  enabledProducts: ['nexus', 'paylinq', 'recruitiq'],
  productRoles: {
    nexus: 'admin',      // Admin in HRIS
    paylinq: 'manager',  // Manager in Payroll
    recruitiq: 'user'    // Standard user in Recruitment
  },
  type: 'tenant'
}
```

---

## Middleware Usage

### Authentication Middleware

```javascript
import {
  authenticatePlatform,
  authenticateTenant,
  requirePlatformRole,
  requirePlatformPermission,
  requireProductAccess,
  requireProductRole
} from '../middleware/auth.js';
```

### Platform (Portal/Admin) Endpoints

```javascript
// ✅ PATTERN 1: Role-based access
router.post('/api/admin/customers',
  authenticatePlatform,              // Verify platform token
  requirePlatformRole('platform_admin', 'super_admin'),
  createCustomer
);

// ✅ PATTERN 2: Permission-based access (recommended)
router.delete('/api/admin/customers/:id',
  authenticatePlatform,
  requirePlatformPermission('customers.delete'),
  deleteCustomer
);

// ✅ PATTERN 3: Multiple permissions (OR logic)
router.get('/api/admin/reports',
  authenticatePlatform,
  requirePlatformPermission('reports.view', 'reports.generate'),
  viewReports
);

// ✅ PATTERN 4: Custom permission check
router.post('/api/admin/critical-action',
  authenticatePlatform,
  requirePlatformRole('super_admin'), // Only super admin
  performCriticalAction
);
```

### Tenant (Product) Endpoints

```javascript
// ✅ PATTERN 1: Product access only
router.get('/api/products/nexus/employees',
  authenticateTenant,
  requireProductAccess('nexus'),
  listEmployees
);

// ✅ PATTERN 2: Product access + role
router.delete('/api/products/nexus/employees/:id',
  authenticateTenant,
  requireProductAccess('nexus'),
  requireProductRole('nexus', 'admin', 'manager'),
  deleteEmployee
);

// ✅ PATTERN 3: Multiple products (user needs access to at least one)
router.get('/api/products/shared/reports',
  authenticateTenant,
  (req, res, next) => {
    const hasAccess = ['nexus', 'paylinq', 'recruitiq'].some(p =>
      req.user.enabledProducts.includes(p)
    );
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access to at least one product required'
      });
    }
    next();
  },
  getSharedReports
);

// ✅ PATTERN 4: Custom authorization logic
router.patch('/api/products/nexus/employees/:id',
  authenticateTenant,
  requireProductAccess('nexus'),
  async (req, res, next) => {
    // Custom check: only employee's manager or admin can update
    const employee = await getEmployee(req.params.id);
    const isManager = req.user.id === employee.managerId;
    const isAdmin = req.user.productRoles.nexus === 'admin';
    
    if (!isManager && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only employee manager or admin can update'
      });
    }
    
    next();
  },
  updateEmployee
);
```

### Middleware Composition Best Practices

```javascript
// ✅ CORRECT: Chain middleware in logical order
router.post('/api/products/paylinq/payroll-runs',
  authenticateTenant,              // 1. Verify user is authenticated
  requireProductAccess('paylinq'), // 2. Verify product access
  requireProductRole('paylinq', 'admin', 'manager'), // 3. Verify role
  validatePayrollRunInput,         // 4. Validate input
  createPayrollRun                 // 5. Execute action
);

// ❌ WRONG: Wrong order
router.post('/api/products/paylinq/payroll-runs',
  requireProductRole('paylinq', 'admin'), // ❌ Will fail - req.user not set yet
  authenticateTenant,
  createPayrollRun
);

// ❌ WRONG: Missing authentication
router.post('/api/products/paylinq/payroll-runs',
  requireProductAccess('paylinq'), // ❌ Will fail - no authentication
  createPayrollRun
);
```

---

## Database Schema

### Platform Users (Portal/Admin)

```sql
-- hris.platform_user table
CREATE TABLE hris.platform_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- RBAC fields
  role VARCHAR(50) NOT NULL DEFAULT 'support',
  permissions JSONB DEFAULT '[]'::jsonb,
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  CONSTRAINT check_role CHECK (role IN (
    'super_admin',
    'platform_admin',
    'security_admin',
    'support'
  ))
);

CREATE INDEX idx_platform_user_email ON hris.platform_user(email);
CREATE INDEX idx_platform_user_role ON hris.platform_user(role);
```

### Tenant Users (Organization)

```sql
-- hris.user_account table
CREATE TABLE hris.user_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID REFERENCES hris.employees(id),
  
  -- RBAC fields
  enabled_products VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR[],
  product_roles JSONB DEFAULT '{}'::jsonb,
  
  -- Example product_roles:
  -- {
  --   "nexus": "admin",
  --   "paylinq": "manager",
  --   "recruitiq": "user"
  -- }
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  UNIQUE(email, organization_id)
);

CREATE INDEX idx_user_account_email ON hris.user_account(email);
CREATE INDEX idx_user_account_org ON hris.user_account(organization_id);
CREATE INDEX idx_user_account_employee ON hris.user_account(employee_id);
```

### Permission Storage

```javascript
// Platform user permissions (JSONB array)
{
  permissions: [
    "portal.view",
    "portal.manage",
    "license.view",
    "license.manage",
    "customers.view",
    "customers.create",
    "customers.update"
  ]
}

// Tenant user product roles (JSONB object)
{
  productRoles: {
    "nexus": "admin",
    "paylinq": "manager",
    "schedulehub": "user",
    "recruitiq": "viewer"
  }
}
```

---

## Implementation Examples

### Example 1: Platform Admin Dashboard

```javascript
// routes/portal.js
import express from 'express';
import {
  authenticatePlatform,
  requirePlatformPermission
} from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticatePlatform);

// Dashboard - requires portal.view
router.get('/dashboard',
  requirePlatformPermission('portal.view'),
  async (req, res) => {
    const stats = await getDashboardStats();
    res.json({ success: true, stats });
  }
);

// Customer management - requires customers.view
router.get('/customers',
  requirePlatformPermission('customers.view'),
  async (req, res) => {
    const customers = await getCustomers();
    res.json({ success: true, customers });
  }
);

// Create customer - requires customers.create
router.post('/customers',
  requirePlatformPermission('customers.create'),
  async (req, res) => {
    const customer = await createCustomer(req.body);
    res.json({ success: true, customer });
  }
);

// Delete customer - requires customers.delete
router.delete('/customers/:id',
  requirePlatformPermission('customers.delete'),
  async (req, res) => {
    await deleteCustomer(req.params.id);
    res.json({ success: true, message: 'Customer deleted' });
  }
);

export default router;
```

### Example 2: Nexus Employee Management

```javascript
// products/nexus/routes/employees.js
import express from 'express';
import {
  authenticateTenant,
  requireProductAccess,
  requireProductRole
} from '../../../middleware/auth.js';

const router = express.Router();

// All routes require tenant authentication + Nexus access
router.use(authenticateTenant);
router.use(requireProductAccess('nexus'));

// List employees - all roles can view
router.get('/', async (req, res) => {
  const employees = await listEmployees(req.user.organizationId);
  res.json({ success: true, employees });
});

// View employee details - all roles can view
router.get('/:id', async (req, res) => {
  const employee = await getEmployee(req.params.id, req.user.organizationId);
  res.json({ success: true, employee });
});

// Create employee - admin or manager only
router.post('/',
  requireProductRole('nexus', 'admin', 'manager'),
  async (req, res) => {
    const employee = await createEmployee(
      req.body,
      req.user.organizationId,
      req.user.id
    );
    res.json({ success: true, employee });
  }
);

// Update employee - admin or manager only
router.patch('/:id',
  requireProductRole('nexus', 'admin', 'manager'),
  async (req, res) => {
    const employee = await updateEmployee(
      req.params.id,
      req.body,
      req.user.organizationId,
      req.user.id
    );
    res.json({ success: true, employee });
  }
);

// Delete employee - admin only
router.delete('/:id',
  requireProductRole('nexus', 'admin'),
  async (req, res) => {
    await deleteEmployee(
      req.params.id,
      req.user.organizationId,
      req.user.id
    );
    res.json({ success: true, message: 'Employee deleted' });
  }
);

// Terminate employment - admin or manager only
router.post('/:id/terminate',
  requireProductRole('nexus', 'admin', 'manager'),
  async (req, res) => {
    await terminateEmployee(
      req.params.id,
      req.body,
      req.user.organizationId,
      req.user.id
    );
    res.json({ success: true, message: 'Employee terminated' });
  }
);

export default router;
```

### Example 3: Custom Authorization Logic

```javascript
// products/paylinq/routes/payroll-runs.js
router.patch('/:id',
  authenticateTenant,
  requireProductAccess('paylinq'),
  async (req, res, next) => {
    // Custom logic: only creator or admin can update draft runs
    const run = await getPayrollRun(req.params.id, req.user.organizationId);
    
    if (run.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft runs can be updated'
      });
    }
    
    const isCreator = run.created_by === req.user.id;
    const isAdmin = req.user.productRoles.paylinq === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only run creator or admin can update'
      });
    }
    
    next();
  },
  updatePayrollRun
);

// Approve run - requires manager or admin
router.post('/:id/approve',
  authenticateTenant,
  requireProductAccess('paylinq'),
  requireProductRole('paylinq', 'admin', 'manager'),
  async (req, res) => {
    await approvePayrollRun(
      req.params.id,
      req.user.organizationId,
      req.user.id
    );
    res.json({ success: true, message: 'Run approved' });
  }
);

// Process run - admin only
router.post('/:id/process',
  authenticateTenant,
  requireProductAccess('paylinq'),
  requireProductRole('paylinq', 'admin'),
  async (req, res) => {
    await processPayrollRun(
      req.params.id,
      req.user.organizationId,
      req.user.id
    );
    res.json({ success: true, message: 'Run processed' });
  }
);
```

---

## Testing Standards

### Testing RBAC Middleware

```javascript
// tests/integration/rbac-platform.test.js
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import { generatePlatformToken } from '../helpers/auth.js';

describe('Platform RBAC Integration Tests', () => {
  let superAdminToken, adminToken, supportToken;

  beforeAll(async () => {
    // Create test users with different roles
    superAdminToken = await generatePlatformToken({
      role: 'super_admin',
      permissions: [] // Super admin gets all permissions
    });

    adminToken = await generatePlatformToken({
      role: 'platform_admin',
      permissions: ['portal.view', 'customers.view', 'customers.create']
    });

    supportToken = await generatePlatformToken({
      role: 'support',
      permissions: ['portal.view', 'customers.view']
    });
  });

  describe('GET /api/admin/customers', () => {
    it('should allow super_admin access', async () => {
      const response = await request(app)
        .get('/api/admin/customers')
        .set('Cookie', [`platform_access_token=${superAdminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow platform_admin with customers.view', async () => {
      const response = await request(app)
        .get('/api/admin/customers')
        .set('Cookie', [`platform_access_token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow support with customers.view', async () => {
      const response = await request(app)
        .get('/api/admin/customers')
        .set('Cookie', [`platform_access_token=${supportToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/customers', () => {
    it('should allow super_admin to create', async () => {
      const response = await request(app)
        .post('/api/admin/customers')
        .set('Cookie', [`platform_access_token=${superAdminToken}`])
        .send({ name: 'Test Customer' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow platform_admin with customers.create', async () => {
      const response = await request(app)
        .post('/api/admin/customers')
        .set('Cookie', [`platform_access_token=${adminToken}`])
        .send({ name: 'Test Customer' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should deny support without customers.create', async () => {
      const response = await request(app)
        .post('/api/admin/customers')
        .set('Cookie', [`platform_access_token=${supportToken}`])
        .send({ name: 'Test Customer' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('customers.create');
    });
  });

  describe('Token Type Enforcement', () => {
    it('should deny tenant token on platform endpoint', async () => {
      const tenantToken = await generateTenantToken({
        organizationId: 'org-123',
        enabledProducts: ['nexus']
      });

      const response = await request(app)
        .get('/api/admin/customers')
        .set('Cookie', [`tenant_access_token=${tenantToken}`])
        .expect(403);

      expect(response.body.message).toContain('Platform access required');
    });
  });
});
```

### Testing Tenant RBAC

```javascript
// tests/integration/rbac-tenant.test.js
describe('Tenant RBAC Integration Tests', () => {
  let adminToken, managerToken, userToken, viewerToken;

  beforeAll(async () => {
    adminToken = await generateTenantToken({
      organizationId: 'org-123',
      enabledProducts: ['nexus'],
      productRoles: { nexus: 'admin' }
    });

    managerToken = await generateTenantToken({
      organizationId: 'org-123',
      enabledProducts: ['nexus'],
      productRoles: { nexus: 'manager' }
    });

    userToken = await generateTenantToken({
      organizationId: 'org-123',
      enabledProducts: ['nexus'],
      productRoles: { nexus: 'user' }
    });

    viewerToken = await generateTenantToken({
      organizationId: 'org-123',
      enabledProducts: ['nexus'],
      productRoles: { nexus: 'viewer' }
    });
  });

  describe('GET /api/products/nexus/employees', () => {
    it('should allow all roles to view', async () => {
      for (const token of [adminToken, managerToken, userToken, viewerToken]) {
        await request(app)
          .get('/api/products/nexus/employees')
          .set('Cookie', [`tenant_access_token=${token}`])
          .expect(200);
      }
    });
  });

  describe('POST /api/products/nexus/employees', () => {
    it('should allow admin to create', async () => {
      await request(app)
        .post('/api/products/nexus/employees')
        .set('Cookie', [`tenant_access_token=${adminToken}`])
        .send({ firstName: 'John', lastName: 'Doe' })
        .expect(201);
    });

    it('should allow manager to create', async () => {
      await request(app)
        .post('/api/products/nexus/employees')
        .set('Cookie', [`tenant_access_token=${managerToken}`])
        .send({ firstName: 'John', lastName: 'Doe' })
        .expect(201);
    });

    it('should deny user from creating', async () => {
      const response = await request(app)
        .post('/api/products/nexus/employees')
        .set('Cookie', [`tenant_access_token=${userToken}`])
        .send({ firstName: 'John', lastName: 'Doe' })
        .expect(403);

      expect(response.body.message).toContain('Required roles');
    });

    it('should deny viewer from creating', async () => {
      await request(app)
        .post('/api/products/nexus/employees')
        .set('Cookie', [`tenant_access_token=${viewerToken}`])
        .send({ firstName: 'John', lastName: 'Doe' })
        .expect(403);
    });
  });

  describe('DELETE /api/products/nexus/employees/:id', () => {
    it('should allow admin to delete', async () => {
      const employee = await createTestEmployee();

      await request(app)
        .delete(`/api/products/nexus/employees/${employee.id}`)
        .set('Cookie', [`tenant_access_token=${adminToken}`])
        .expect(200);
    });

    it('should deny manager from deleting', async () => {
      const employee = await createTestEmployee();

      await request(app)
        .delete(`/api/products/nexus/employees/${employee.id}`)
        .set('Cookie', [`tenant_access_token=${managerToken}`])
        .expect(403);
    });
  });

  describe('Product Access Enforcement', () => {
    it('should deny access without product enabled', async () => {
      const noAccessToken = await generateTenantToken({
        organizationId: 'org-123',
        enabledProducts: ['paylinq'], // No nexus access
        productRoles: { paylinq: 'admin' }
      });

      const response = await request(app)
        .get('/api/products/nexus/employees')
        .set('Cookie', [`tenant_access_token=${noAccessToken}`])
        .expect(403);

      expect(response.body.message).toContain('nexus access required');
    });
  });
});
```

---

## Migration Guide

### Migrating Existing Routes to RBAC

#### Step 1: Identify Current Authentication

```javascript
// BEFORE: Old authentication
router.get('/api/jobs',
  authenticate,  // Old middleware
  getJobs
);
```

#### Step 2: Determine Context (Platform or Tenant)

```javascript
// Is this a platform admin endpoint or tenant product endpoint?

// Platform endpoint (portal/admin)
// - Manages platform resources
// - Used by RecruitIQ staff
// - No organization context

// Tenant endpoint (product)
// - Manages organization data
// - Used by organization users
// - Organization-scoped
```

#### Step 3: Replace with Appropriate Middleware

```javascript
// AFTER: Platform endpoint
router.get('/api/admin/customers',
  authenticatePlatform,
  requirePlatformPermission('customers.view'),
  getCustomers
);

// AFTER: Tenant endpoint
router.get('/api/products/nexus/employees',
  authenticateTenant,
  requireProductAccess('nexus'),
  getEmployees
);
```

#### Step 4: Update Tests

```javascript
// BEFORE: Old test
const token = jwt.sign({ userId: user.id }, JWT_SECRET);
await request(app)
  .get('/api/jobs')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

// AFTER: New test with cookie
const token = await generateTenantToken({
  organizationId: 'org-123',
  enabledProducts: ['recruitiq']
});
await request(app)
  .get('/api/products/recruitiq/jobs')
  .set('Cookie', [`tenant_access_token=${token}`])
  .expect(200);
```

### Migration Checklist

**For Each Route:**

- [ ] Identify context (platform vs tenant)
- [ ] Replace authentication middleware
- [ ] Add permission/role checks
- [ ] Update route path if needed
- [ ] Update tests to use cookies
- [ ] Verify token type enforcement
- [ ] Test all role combinations
- [ ] Update documentation

### Common Migration Patterns

```javascript
// Pattern 1: Admin endpoint → Platform
authenticate → authenticatePlatform + requirePlatformRole

// Pattern 2: Admin endpoint with permissions
authenticate + requireRole → authenticatePlatform + requirePlatformPermission

// Pattern 3: Product endpoint
authenticate → authenticateTenant + requireProductAccess

// Pattern 4: Product endpoint with role
authenticate + requireRole → authenticateTenant + requireProductAccess + requireProductRole
```

---

## RBAC Best Practices

### 1. Principle of Least Privilege

✅ **Grant minimum permissions needed**
```javascript
// ✅ GOOD: Specific permission
requirePlatformPermission('customers.view')

// ❌ BAD: Overly broad
requirePlatformPermission('admin') // Too broad!
```

### 2. Defense in Depth

✅ **Multiple layers of protection**
```javascript
router.delete('/api/products/nexus/employees/:id',
  authenticateTenant,              // Layer 1: Authentication
  requireProductAccess('nexus'),   // Layer 2: Product access
  requireProductRole('nexus', 'admin'), // Layer 3: Role check
  async (req, res) => {
    // Layer 4: Verify ownership in business logic
    const employee = await getEmployee(req.params.id);
    if (employee.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false });
    }
    await deleteEmployee(req.params.id);
  }
);
```

### 3. Fail Securely

✅ **Deny by default**
```javascript
// ✅ GOOD: Explicit permission required
if (!req.user.permissions.includes('resource.action')) {
  return res.status(403).json({ success: false });
}

// ❌ BAD: Allowing by default
if (!req.user.permissions.includes('resource.action')) {
  // Do nothing, allow access ❌
}
```

### 4. Audit All Access

✅ **Log permission checks**
```javascript
logger.warn('Permission denied', {
  userId: req.user.id,
  requiredPermission: 'customers.delete',
  userPermissions: req.user.permissions,
  endpoint: req.path
});
```

### 5. Token Type Enforcement

✅ **Always verify token type**
```javascript
// Middleware already checks this, but verify in sensitive operations
if (req.user.type !== 'platform') {
  return res.status(403).json({
    success: false,
    message: 'Platform access required'
  });
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: 403 Forbidden on Valid Request

**Symptoms:**
```
GET /api/admin/customers
Response: 403 Forbidden
Message: "Access denied. Required permissions: customers.view"
```

**Solutions:**
1. Verify user has correct permission in database
2. Check token includes correct permissions
3. Verify middleware order (authenticate before permission check)
4. Check super_admin bypass logic

#### Issue 2: Token Type Mismatch

**Symptoms:**
```
GET /api/admin/customers
Response: 403 Forbidden
Message: "Invalid token type. Platform access required."
```

**Solutions:**
1. Verify endpoint uses correct middleware (authenticatePlatform)
2. Check token was generated with type: 'platform'
3. Ensure cookie name matches (platform_access_token)

#### Issue 3: Product Access Denied

**Symptoms:**
```
GET /api/products/nexus/employees
Response: 403 Forbidden
Message: "Access denied. nexus access required."
```

**Solutions:**
1. Verify user has 'nexus' in enabledProducts array
2. Check organization subscription includes Nexus
3. Verify middleware order (requireProductAccess after authenticateTenant)

---

## Security Considerations

### 1. Token Security

✅ **Use httpOnly cookies** - Prevents XSS attacks
```javascript
res.cookie('tenant_access_token', token, {
  httpOnly: true,  // ✅ Cannot be accessed by JavaScript
  secure: true,    // ✅ HTTPS only
  sameSite: 'strict' // ✅ CSRF protection
});
```

### 2. Permission Validation

✅ **Validate permissions exist**
```javascript
const VALID_PERMISSIONS = [
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete'
];

function validatePermissions(permissions) {
  return permissions.every(p => VALID_PERMISSIONS.includes(p));
}
```

### 3. Rate Limiting by Role

✅ **Higher limits for admins**
```javascript
const rateLimitByRole = (req) => {
  if (req.user.role === 'super_admin') return 1000;
  if (req.user.role === 'platform_admin') return 500;
  return 100;
};
```

### 4. Session Management

✅ **Invalidate tokens on role change**
```javascript
async function updateUserRole(userId, newRole) {
  await updateRole(userId, newRole);
  await invalidateAllUserTokens(userId); // Force re-login
}
```

---

## References

- [BACKEND_STANDARDS.md](./BACKEND_STANDARDS.md) - Backend architecture
- [API_STANDARDS.md](./API_STANDARDS.md) - API design patterns
- [SECURITY_STANDARDS.md](./SECURITY_STANDARDS.md) - Security guidelines
- [TESTING_STANDARDS.md](./TESTING_STANDARDS.md) - Testing patterns

---

**Next Steps:**
1. Review middleware implementation in `backend/src/middleware/auth.js`
2. Follow role definitions in database schema
3. Implement permission checks on all protected routes
4. Write integration tests for RBAC scenarios
5. Document custom authorization logic
