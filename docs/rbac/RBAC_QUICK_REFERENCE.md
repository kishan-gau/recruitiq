# RBAC Quick Reference Guide

**Quick lookup for RBAC patterns in RecruitIQ**  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Quick Decision Tree

```
Is this a portal/admin endpoint?
├─ YES → Use Platform RBAC
│   ├─ authenticatePlatform
│   └─ requirePlatformRole or requirePlatformPermission
│
└─ NO → Use Tenant RBAC
    ├─ authenticateTenant
    ├─ requireProductAccess
    └─ requireProductRole (optional)
```

---

## Platform (Portal/Admin) Patterns

### Basic Authentication

```javascript
import { authenticatePlatform, requirePlatformPermission } from '../middleware/auth.js';

// Read-only endpoint
router.get('/api/admin/customers',
  authenticatePlatform,
  requirePlatformPermission('customers.view'),
  getCustomers
);

// Write endpoint
router.post('/api/admin/customers',
  authenticatePlatform,
  requirePlatformPermission('customers.create'),
  createCustomer
);

// Delete endpoint (high-risk)
router.delete('/api/admin/customers/:id',
  authenticatePlatform,
  requirePlatformPermission('customers.delete'),
  deleteCustomer
);

// Super admin only
router.post('/api/admin/critical-action',
  authenticatePlatform,
  requirePlatformRole('super_admin'),
  performCriticalAction
);
```

### Platform Roles

| Role | Usage | Permissions |
|------|-------|-------------|
| `super_admin` | Emergency/dev access | ALL permissions |
| `platform_admin` | Daily operations | portal.*, license.*, customers.* |
| `security_admin` | Security monitoring | security.*, users.view |
| `support` | Customer support | portal.view, customers.view |

### Platform Permissions

```
portal.view              - Access portal dashboard
portal.manage            - Manage portal settings
license.view             - View licenses
license.manage           - Manage licenses
license.tiers.manage     - Manage tier definitions
customers.view           - View customers
customers.create         - Create customers
customers.update         - Update customers
customers.delete         - Delete customers
users.view               - View platform users
users.create             - Create platform users
users.permissions        - Manage permissions
security.dashboard       - View security dashboard
security.audit           - Access audit logs
```

---

## Tenant (Product) Patterns

### Basic Authentication

```javascript
import {
  authenticateTenant,
  requireProductAccess,
  requireProductRole
} from '../middleware/auth.js';

// All users in product
router.get('/api/products/nexus/employees',
  authenticateTenant,
  requireProductAccess('nexus'),
  listEmployees
);

// Admin + Manager only
router.post('/api/products/nexus/employees',
  authenticateTenant,
  requireProductAccess('nexus'),
  requireProductRole('nexus', 'admin', 'manager'),
  createEmployee
);

// Admin only
router.delete('/api/products/nexus/employees/:id',
  authenticateTenant,
  requireProductAccess('nexus'),
  requireProductRole('nexus', 'admin'),
  deleteEmployee
);
```

### Product Roles

| Role | Usage | Permissions |
|------|-------|-------------|
| `admin` | Product administrator | All product features |
| `manager` | Team manager | Manage team resources, view reports |
| `user` | Standard user | Create/update own resources |
| `viewer` | Read-only | View-only access |

### Product List

| Product | Slug | Description |
|---------|------|-------------|
| Nexus | `nexus` | HRIS (employees, benefits, documents) |
| PayLinQ | `paylinq` | Payroll (runs, compensation, tax) |
| ScheduleHub | `schedulehub` | Scheduling (shifts, stations) |
| RecruitIQ | `recruitiq` | Recruitment (jobs, candidates) |

---

## Middleware Cheat Sheet

### Import Statement

```javascript
import {
  // Platform
  authenticatePlatform,
  requirePlatformRole,
  requirePlatformPermission,
  
  // Tenant
  authenticateTenant,
  requireProductAccess,
  requireProductRole,
  
  // Optional
  optionalAuth
} from '../middleware/auth.js';
```

### Middleware Signatures

```javascript
// Platform
authenticatePlatform(req, res, next)
requirePlatformRole(...roles)
requirePlatformPermission(...permissions)

// Tenant
authenticateTenant(req, res, next)
requireProductAccess(productSlug)
requireProductRole(productSlug, ...roles)

// Optional
optionalAuth(req, res, next)
```

### Middleware Order

```javascript
// ✅ CORRECT ORDER
router.post('/endpoint',
  authenticate,        // 1. Authentication
  requireAccess,       // 2. Access check
  requireRole,         // 3. Role check
  validateInput,       // 4. Validation
  handler             // 5. Business logic
);

// ❌ WRONG ORDER
router.post('/endpoint',
  requireRole,         // ❌ Will fail - no req.user yet
  authenticate,
  handler
);
```

---

## Request Object Structure

### After authenticatePlatform

```javascript
req.user = {
  id: 'uuid',
  email: 'admin@recruitiq.com',
  name: 'Admin User',
  role: 'platform_admin',
  permissions: ['portal.view', 'customers.view', ...],
  type: 'platform'
}
```

### After authenticateTenant

```javascript
req.user = {
  id: 'uuid',
  email: 'user@company.com',
  organizationId: 'org-uuid',
  organization_id: 'org-uuid', // snake_case alias
  organizationName: 'Company Inc',
  organizationTier: 'enterprise',
  employeeId: 'emp-uuid',
  firstName: 'John',
  lastName: 'Doe',
  employeeNumber: 'EMP-001',
  enabledProducts: ['nexus', 'paylinq'],
  productRoles: {
    nexus: 'admin',
    paylinq: 'manager'
  },
  type: 'tenant',
  user_type: 'tenant' // Compatibility alias
}
```

---

## Common Patterns

### Pattern 1: View All / Admin Actions

```javascript
// Anyone can view
router.get('/api/products/nexus/employees',
  authenticateTenant,
  requireProductAccess('nexus'),
  listEmployees
);

// Only admin can delete
router.delete('/api/products/nexus/employees/:id',
  authenticateTenant,
  requireProductAccess('nexus'),
  requireProductRole('nexus', 'admin'),
  deleteEmployee
);
```

### Pattern 2: Custom Authorization

```javascript
router.patch('/api/products/paylinq/payroll-runs/:id',
  authenticateTenant,
  requireProductAccess('paylinq'),
  async (req, res, next) => {
    // Custom check: creator or admin can update
    const run = await getPayrollRun(req.params.id);
    const isCreator = run.created_by === req.user.id;
    const isAdmin = req.user.productRoles.paylinq === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only creator or admin can update'
      });
    }
    next();
  },
  updatePayrollRun
);
```

### Pattern 3: Multiple Products

```javascript
router.get('/api/products/shared/reports',
  authenticateTenant,
  (req, res, next) => {
    // Requires access to at least one product
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
```

### Pattern 4: Super Admin Bypass

```javascript
// Super admins automatically have all permissions
if (req.user.role === 'super_admin') {
  return next(); // Bypass permission checks
}
```

---

## Testing Patterns

### Generate Platform Token (Test)

```javascript
import { generatePlatformToken } from '../helpers/auth.js';

const token = await generatePlatformToken({
  id: 'user-uuid',
  email: 'admin@recruitiq.com',
  role: 'platform_admin',
  permissions: ['portal.view', 'customers.view']
});

// Use in request
await request(app)
  .get('/api/admin/customers')
  .set('Cookie', [`platform_access_token=${token}`])
  .expect(200);
```

### Generate Tenant Token (Test)

```javascript
import { generateTenantToken } from '../helpers/auth.js';

const token = await generateTenantToken({
  id: 'user-uuid',
  email: 'user@company.com',
  organizationId: 'org-uuid',
  enabledProducts: ['nexus', 'paylinq'],
  productRoles: {
    nexus: 'admin',
    paylinq: 'manager'
  }
});

// Use in request
await request(app)
  .get('/api/products/nexus/employees')
  .set('Cookie', [`tenant_access_token=${token}`])
  .expect(200);
```

### Test RBAC Scenarios

```javascript
describe('RBAC Tests', () => {
  it('should allow admin access', async () => {
    const adminToken = await generateToken({ role: 'admin' });
    await request(app)
      .post('/api/resource')
      .set('Cookie', [`tenant_access_token=${adminToken}`])
      .expect(201);
  });

  it('should deny user access', async () => {
    const userToken = await generateToken({ role: 'user' });
    await request(app)
      .post('/api/resource')
      .set('Cookie', [`tenant_access_token=${userToken}`])
      .expect(403);
  });

  it('should deny access without product', async () => {
    const token = await generateToken({ enabledProducts: [] });
    await request(app)
      .get('/api/products/nexus/employees')
      .set('Cookie', [`tenant_access_token=${token}`])
      .expect(403);
  });
});
```

---

## HTTP Status Codes

| Code | When to Use | Example |
|------|-------------|---------|
| **200** | Successful GET/PATCH | Retrieved data |
| **201** | Successful POST | Resource created |
| **400** | Validation error | Invalid input |
| **401** | No token or invalid | Missing/expired token |
| **403** | Insufficient permissions | Wrong role/permission |
| **404** | Resource not found | Non-existent ID |

### RBAC-Specific Status Codes

```javascript
// 401 - Not authenticated
{
  success: false,
  message: 'No authorization token provided'
}

// 403 - Token type mismatch
{
  success: false,
  message: 'Invalid token type. Platform access required.'
}

// 403 - Missing permission
{
  success: false,
  message: 'Access denied. Required permissions: customers.delete'
}

// 403 - Missing role
{
  success: false,
  message: 'Access denied. Required roles in nexus: admin, manager'
}

// 403 - Product access denied
{
  success: false,
  message: 'Access denied. nexus access required.'
}
```

---

## Error Messages

### Platform Errors

```javascript
// No token
'No authorization token provided'

// Invalid/expired token
'Token expired'
'Invalid token'

// Wrong token type
'Invalid token type. Platform access required.'

// Insufficient permissions
'Access denied. Required permissions: customers.delete'

// Insufficient role
'Access denied. Required roles: platform_admin, super_admin'

// Account issues
'Account is inactive'
'Account is locked'
```

### Tenant Errors

```javascript
// No token
'No authorization token provided'

// Invalid/expired token
'Token expired'
'Invalid token'

// Wrong token type
'Invalid token type. Tenant access required.'

// Missing organization context
'Invalid token: missing organization context'

// Product access denied
'Access denied. nexus access required.'

// Insufficient role
'Access denied. Required roles in paylinq: admin, manager'

// Subscription issues
'Organization subscription is not active'
```

---

## Debugging Checklist

### When 403 Forbidden Occurs

1. ✅ Check token type matches endpoint (platform vs tenant)
2. ✅ Verify user has correct role/permission in database
3. ✅ Confirm middleware order (authenticate before permission check)
4. ✅ Check cookie name matches (platform_access_token vs tenant_access_token)
5. ✅ Verify product in enabledProducts array (tenant endpoints)
6. ✅ Check organization subscription status (tenant endpoints)
7. ✅ Review logs for permission denial details

### When 401 Unauthorized Occurs

1. ✅ Verify token is present in cookie
2. ✅ Check token is not expired
3. ✅ Confirm JWT_SECRET matches what was used to sign token
4. ✅ Verify token format is correct (type field present)
5. ✅ Check user exists in database
6. ✅ Confirm account is active (not locked/disabled)

---

## Copy-Paste Snippets

### Platform Endpoint Template

```javascript
// routes/admin.js
import express from 'express';
import {
  authenticatePlatform,
  requirePlatformPermission
} from '../middleware/auth.js';

const router = express.Router();

router.use(authenticatePlatform); // All routes require auth

// View
router.get('/resource',
  requirePlatformPermission('resource.view'),
  getResource
);

// Create
router.post('/resource',
  requirePlatformPermission('resource.create'),
  createResource
);

// Update
router.patch('/resource/:id',
  requirePlatformPermission('resource.update'),
  updateResource
);

// Delete
router.delete('/resource/:id',
  requirePlatformPermission('resource.delete'),
  deleteResource
);

export default router;
```

### Tenant Endpoint Template

```javascript
// products/nexus/routes/resource.js
import express from 'express';
import {
  authenticateTenant,
  requireProductAccess,
  requireProductRole
} from '../../../middleware/auth.js';

const router = express.Router();

router.use(authenticateTenant);
router.use(requireProductAccess('nexus'));

// View (all roles)
router.get('/', getResources);

// Create (admin/manager)
router.post('/',
  requireProductRole('nexus', 'admin', 'manager'),
  createResource
);

// Update (admin/manager)
router.patch('/:id',
  requireProductRole('nexus', 'admin', 'manager'),
  updateResource
);

// Delete (admin only)
router.delete('/:id',
  requireProductRole('nexus', 'admin'),
  deleteResource
);

export default router;
```

### Test Template

```javascript
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import { generateTenantToken } from '../helpers/auth.js';

describe('Resource RBAC Tests', () => {
  let adminToken, managerToken, userToken;

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
  });

  describe('GET /api/products/nexus/resource', () => {
    it('should allow all roles to view', async () => {
      for (const token of [adminToken, managerToken, userToken]) {
        await request(app)
          .get('/api/products/nexus/resource')
          .set('Cookie', [`tenant_access_token=${token}`])
          .expect(200);
      }
    });
  });

  describe('POST /api/products/nexus/resource', () => {
    it('should allow admin to create', async () => {
      await request(app)
        .post('/api/products/nexus/resource')
        .set('Cookie', [`tenant_access_token=${adminToken}`])
        .send({ name: 'Test' })
        .expect(201);
    });

    it('should allow manager to create', async () => {
      await request(app)
        .post('/api/products/nexus/resource')
        .set('Cookie', [`tenant_access_token=${managerToken}`])
        .send({ name: 'Test' })
        .expect(201);
    });

    it('should deny user from creating', async () => {
      await request(app)
        .post('/api/products/nexus/resource')
        .set('Cookie', [`tenant_access_token=${userToken}`])
        .send({ name: 'Test' })
        .expect(403);
    });
  });

  describe('DELETE /api/products/nexus/resource/:id', () => {
    it('should allow admin to delete', async () => {
      const resource = await createTestResource();
      await request(app)
        .delete(`/api/products/nexus/resource/${resource.id}`)
        .set('Cookie', [`tenant_access_token=${adminToken}`])
        .expect(200);
    });

    it('should deny manager from deleting', async () => {
      const resource = await createTestResource();
      await request(app)
        .delete(`/api/products/nexus/resource/${resource.id}`)
        .set('Cookie', [`tenant_access_token=${managerToken}`])
        .expect(403);
    });
  });
});
```

---

## Additional Resources

- **[RBAC_IMPLEMENTATION_GUIDE.md](./RBAC_IMPLEMENTATION_GUIDE.md)** - Complete implementation guide
- **[BACKEND_STANDARDS.md](./BACKEND_STANDARDS.md)** - Backend architecture
- **[SECURITY_STANDARDS.md](./SECURITY_STANDARDS.md)** - Security guidelines
- **[TESTING_STANDARDS.md](./TESTING_STANDARDS.md)** - Testing patterns

---

**Last Updated:** November 21, 2025
