# RBAC Migration Checklist

**Migration guide for converting existing routes to RBAC system**  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Overview

This checklist helps migrate existing authentication to the new dual-context RBAC system with platform and tenant separation.

---

## Pre-Migration Assessment

### Step 1: Inventory Routes

Create a list of all routes requiring migration:

```bash
# Find all route files
cd backend/src
grep -r "router\.(get|post|put|patch|delete)" routes/ products/ --include="*.js"

# Look for old authentication patterns
grep -r "authenticate(" routes/ products/ --include="*.js"
grep -r "requireRole(" routes/ products/ --include="*.js"
grep -r "Bearer " routes/ products/ --include="*.js"
```

### Step 2: Categorize Routes

For each route, determine:

| Question | Answer | Action |
|----------|--------|--------|
| Is this a portal/admin endpoint? | YES | Use Platform RBAC |
| Is this a portal/admin endpoint? | NO | Use Tenant RBAC |
| What permissions are needed? | List | Map to permission system |
| What roles can access? | List | Map to role system |
| Is product-specific? | YES/NO | Add product check if YES |

### Step 3: Document Current Behavior

For each route, document:
- Current authentication middleware
- Current authorization checks
- Expected user roles
- Business logic permissions

---

## Migration Workflow

### Phase 1: Preparation

#### Checklist

- [ ] Read [RBAC_IMPLEMENTATION_GUIDE.md](./RBAC_IMPLEMENTATION_GUIDE.md)
- [ ] Read [RBAC_QUICK_REFERENCE.md](./RBAC_QUICK_REFERENCE.md)
- [ ] Review current middleware implementation in `backend/src/middleware/auth.js`
- [ ] Identify all routes requiring migration
- [ ] Create backup branch
- [ ] Set up test environment
- [ ] Create test users with different roles
- [ ] Document expected behavior per route

### Phase 2: Database Setup

#### Platform Users Setup

```sql
-- Verify platform_user table exists with RBAC fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'hris' 
  AND table_name = 'platform_user'
  AND column_name IN ('role', 'permissions');

-- Create test platform users
INSERT INTO hris.platform_user (
  id, email, password_hash, name, role, permissions, is_active
) VALUES
  (gen_random_uuid(), 'superadmin@test.com', '$2b$12$...', 'Super Admin', 'super_admin', '[]'::jsonb, true),
  (gen_random_uuid(), 'admin@test.com', '$2b$12$...', 'Platform Admin', 'platform_admin', 
   '["portal.view", "portal.manage", "customers.view", "customers.create"]'::jsonb, true),
  (gen_random_uuid(), 'support@test.com', '$2b$12$...', 'Support User', 'support', 
   '["portal.view", "customers.view"]'::jsonb, true);
```

#### Tenant Users Setup

```sql
-- Verify user_account table has product RBAC fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'hris' 
  AND table_name = 'user_account'
  AND column_name IN ('enabled_products', 'product_roles');

-- Create test tenant users
INSERT INTO hris.user_account (
  id, email, password_hash, organization_id, enabled_products, product_roles, is_active
) VALUES
  (gen_random_uuid(), 'admin@company.com', '$2b$12$...', 'org-123', 
   ARRAY['nexus', 'paylinq', 'recruitiq']::varchar[], 
   '{"nexus": "admin", "paylinq": "admin", "recruitiq": "admin"}'::jsonb, true),
  (gen_random_uuid(), 'manager@company.com', '$2b$12$...', 'org-123', 
   ARRAY['nexus', 'paylinq']::varchar[], 
   '{"nexus": "manager", "paylinq": "manager"}'::jsonb, true),
  (gen_random_uuid(), 'user@company.com', '$2b$12$...', 'org-123', 
   ARRAY['nexus']::varchar[], 
   '{"nexus": "user"}'::jsonb, true);
```

#### Checklist

- [ ] Verify `hris.platform_user` table schema
- [ ] Verify `hris.user_account` table schema
- [ ] Create test platform users with different roles
- [ ] Create test tenant users with different product roles
- [ ] Verify JWT_SECRET is configured
- [ ] Verify JWT_REFRESH_SECRET is configured
- [ ] Test token generation for both contexts

### Phase 3: Route Migration

#### For Each Route

##### Step 1: Identify Context

```javascript
// BEFORE
router.get('/api/jobs', authenticate, getJobs);

// DECISION TREE
// Is this a portal/admin endpoint managing platform resources?
//   YES → Platform context
//   NO → Is this an organization product endpoint?
//     YES → Tenant context
```

##### Step 2: Update Imports

```javascript
// BEFORE
import { authenticate, requireRole } from '../middleware/auth.js';

// AFTER (Platform)
import {
  authenticatePlatform,
  requirePlatformRole,
  requirePlatformPermission
} from '../middleware/auth.js';

// AFTER (Tenant)
import {
  authenticateTenant,
  requireProductAccess,
  requireProductRole
} from '../middleware/auth.js';
```

##### Step 3: Update Route Definition

```javascript
// BEFORE: Old pattern
router.get('/api/jobs',
  authenticate,
  getJobs
);

router.post('/api/jobs',
  authenticate,
  requireRole('admin'),
  createJob
);

// AFTER: Platform endpoint
router.get('/api/admin/customers',
  authenticatePlatform,
  requirePlatformPermission('customers.view'),
  getCustomers
);

router.post('/api/admin/customers',
  authenticatePlatform,
  requirePlatformPermission('customers.create'),
  createCustomer
);

// AFTER: Tenant endpoint
router.get('/api/products/recruitiq/jobs',
  authenticateTenant,
  requireProductAccess('recruitiq'),
  getJobs
);

router.post('/api/products/recruitiq/jobs',
  authenticateTenant,
  requireProductAccess('recruitiq'),
  requireProductRole('recruitiq', 'admin', 'manager'),
  createJob
);
```

##### Step 4: Update Controller

```javascript
// BEFORE: Controller uses old req.user structure
async function getJobs(req, res) {
  const { userId, organizationId } = req.user;
  const jobs = await JobService.list(organizationId);
  res.json({ data: jobs }); // Generic "data" key
}

// AFTER: Controller uses new req.user structure
async function getJobs(req, res) {
  // Platform context: req.user.type === 'platform'
  // Tenant context: req.user.type === 'tenant'
  
  const jobs = await JobService.list(req.user.organizationId);
  res.json({ success: true, jobs }); // Resource-specific key
}
```

##### Step 5: Update Tests

```javascript
// BEFORE: Old test with Bearer token
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: 'user-123', organizationId: 'org-123' },
  process.env.JWT_SECRET
);

await request(app)
  .get('/api/jobs')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

// AFTER: New test with cookie and context
import { generateTenantToken } from '../helpers/auth.js';

const token = await generateTenantToken({
  id: 'user-123',
  organizationId: 'org-123',
  enabledProducts: ['recruitiq'],
  productRoles: { recruitiq: 'admin' }
});

await request(app)
  .get('/api/products/recruitiq/jobs')
  .set('Cookie', [`tenant_access_token=${token}`])
  .expect(200);
```

##### Step 6: Test Migration

```bash
# Run specific test file
npm test -- path/to/route.test.js

# Run integration tests
npm run test:integration

# Check for regressions
npm test
```

#### Route Migration Checklist (Per Route)

- [ ] Identify context (platform vs tenant)
- [ ] Update imports
- [ ] Replace authentication middleware
- [ ] Add permission/role checks
- [ ] Update route path if needed (add /api/products/{slug})
- [ ] Update controller to use new req.user structure
- [ ] Update response format (resource-specific keys)
- [ ] Update all tests
- [ ] Test with different roles
- [ ] Verify token type enforcement
- [ ] Document any custom authorization logic
- [ ] Code review

### Phase 4: Testing

#### Create Test Helpers

```javascript
// tests/helpers/auth.js
import jwt from 'jsonwebtoken';

/**
 * Generate platform access token
 */
export async function generatePlatformToken(userData = {}) {
  const payload = {
    id: userData.id || 'platform-user-123',
    email: userData.email || 'admin@test.com',
    role: userData.role || 'platform_admin',
    permissions: userData.permissions || ['portal.view'],
    type: 'platform'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Generate tenant access token
 */
export async function generateTenantToken(userData = {}) {
  const payload = {
    id: userData.id || 'tenant-user-123',
    email: userData.email || 'user@company.com',
    organizationId: userData.organizationId || 'org-123',
    enabledProducts: userData.enabledProducts || ['nexus'],
    productRoles: userData.productRoles || { nexus: 'admin' },
    type: 'tenant'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Make authenticated platform request
 */
export async function platformRequest(app, method, path, data = {}, role = 'platform_admin') {
  const token = await generatePlatformToken({ role });
  
  return request(app)
    [method](path)
    .set('Cookie', [`platform_access_token=${token}`])
    .send(data);
}

/**
 * Make authenticated tenant request
 */
export async function tenantRequest(app, method, path, data = {}, options = {}) {
  const token = await generateTenantToken(options);
  
  return request(app)
    [method](path)
    .set('Cookie', [`tenant_access_token=${token}`])
    .send(data);
}
```

#### Test Coverage Matrix

Create tests for each endpoint:

| Endpoint | Context | Test Scenarios |
|----------|---------|----------------|
| GET /resource | Platform | ✓ Super admin<br>✓ Admin with permission<br>✓ User without permission<br>✓ Wrong token type |
| POST /resource | Platform | ✓ Super admin<br>✓ Admin with permission<br>✓ User without permission |
| GET /product/resource | Tenant | ✓ Admin role<br>✓ Manager role<br>✓ User role<br>✓ Viewer role<br>✓ No product access<br>✓ Wrong token type |
| POST /product/resource | Tenant | ✓ Admin can create<br>✓ Manager can create<br>✓ User cannot create<br>✓ No product access |

#### Testing Checklist

- [ ] Create test helpers for token generation
- [ ] Test all role combinations per endpoint
- [ ] Test token type enforcement (platform vs tenant)
- [ ] Test missing permissions
- [ ] Test missing product access
- [ ] Test cross-organization access (should fail)
- [ ] Test expired tokens
- [ ] Test invalid tokens
- [ ] Test account locked/inactive scenarios
- [ ] Run full test suite
- [ ] Check code coverage (target >80%)

### Phase 5: Documentation

#### Update Route Documentation

```javascript
/**
 * @route   GET /api/admin/customers
 * @desc    List all customers
 * @access  Platform - requires customers.view permission
 * @context Platform
 * @roles   platform_admin, super_admin
 * @permissions customers.view
 */
router.get('/customers',
  authenticatePlatform,
  requirePlatformPermission('customers.view'),
  getCustomers
);

/**
 * @route   POST /api/products/nexus/employees
 * @desc    Create a new employee
 * @access  Tenant - requires nexus product access + admin/manager role
 * @context Tenant
 * @product nexus
 * @roles   admin, manager
 */
router.post('/',
  authenticateTenant,
  requireProductAccess('nexus'),
  requireProductRole('nexus', 'admin', 'manager'),
  createEmployee
);
```

#### Documentation Checklist

- [ ] Add JSDoc comments to all routes
- [ ] Document required permissions
- [ ] Document required roles
- [ ] Document context (platform vs tenant)
- [ ] Update API documentation
- [ ] Update README if needed
- [ ] Document custom authorization logic
- [ ] Add examples to team wiki

### Phase 6: Deployment

#### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Database migrations applied (if any)
- [ ] Test users created in staging
- [ ] Staging deployment tested
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Rollback plan documented

#### Deployment Steps

```bash
# 1. Backup database
pg_dump recruitiq_db > backup_$(date +%Y%m%d).sql

# 2. Run migrations (if any)
npm run migrate

# 3. Deploy code
git checkout main
git pull origin main
npm install
npm run build

# 4. Restart services
pm2 restart all

# 5. Verify deployment
curl http://localhost:4000/health
npm run test:smoke

# 6. Monitor logs
tail -f logs/app.log
pm2 logs
```

#### Post-Deployment Checklist

- [ ] Health check passing
- [ ] Smoke tests passing
- [ ] No errors in logs
- [ ] Authentication working
- [ ] Authorization working
- [ ] Token generation working
- [ ] Monitor for 403 errors
- [ ] Monitor for 401 errors
- [ ] Check response times
- [ ] Verify no regressions

---

## Common Migration Patterns

### Pattern 1: Simple Admin Endpoint

```javascript
// BEFORE
router.get('/api/admin/users', authenticate, requireRole('admin'), getUsers);

// AFTER
router.get('/api/admin/users',
  authenticatePlatform,
  requirePlatformPermission('users.view'),
  getUsers
);
```

### Pattern 2: Product Endpoint with Role

```javascript
// BEFORE
router.post('/api/jobs', authenticate, requireRole('admin', 'manager'), createJob);

// AFTER
router.post('/api/products/recruitiq/jobs',
  authenticateTenant,
  requireProductAccess('recruitiq'),
  requireProductRole('recruitiq', 'admin', 'manager'),
  createJob
);
```

### Pattern 3: Custom Authorization

```javascript
// BEFORE
router.patch('/api/resources/:id',
  authenticate,
  async (req, res) => {
    const resource = await getResource(req.params.id);
    if (resource.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Continue...
  }
);

// AFTER
router.patch('/api/products/nexus/resources/:id',
  authenticateTenant,
  requireProductAccess('nexus'),
  async (req, res, next) => {
    const resource = await getResource(req.params.id);
    const isOwner = resource.ownerId === req.user.id;
    const isAdmin = req.user.productRoles.nexus === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only resource owner or admin can update'
      });
    }
    next();
  },
  updateResource
);
```

---

## Rollback Plan

If issues occur after migration:

### Immediate Rollback

```bash
# 1. Switch to previous version
git checkout <previous-commit>

# 2. Reinstall dependencies
npm install

# 3. Restart services
pm2 restart all

# 4. Verify rollback
npm run test:smoke
```

### Database Rollback (if migrations applied)

```bash
# 1. Restore database backup
psql recruitiq_db < backup_YYYYMMDD.sql

# 2. Verify data integrity
psql recruitiq_db -c "SELECT COUNT(*) FROM hris.platform_user"
```

---

## Migration Tracking

### Progress Tracker Template

Create a spreadsheet/document with:

| Route | File | Status | Context | Permissions | Tests | Notes |
|-------|------|--------|---------|-------------|-------|-------|
| GET /api/admin/customers | routes/admin.js | ✅ Done | Platform | customers.view | ✅ Pass | - |
| POST /api/admin/customers | routes/admin.js | ✅ Done | Platform | customers.create | ✅ Pass | - |
| GET /api/products/nexus/employees | products/nexus/routes/employees.js | 🔄 In Progress | Tenant | nexus access | ⏳ Pending | - |

### Status Legend

- ✅ Done - Migrated, tested, deployed
- 🔄 In Progress - Currently migrating
- ⏳ Pending - Not started
- ❌ Blocked - Issues preventing migration
- 🔍 Review - Needs code review

---

## Success Criteria

Migration is complete when:

- [ ] All routes migrated to new RBAC system
- [ ] All tests passing with >80% coverage
- [ ] No Bearer token authentication remaining
- [ ] All endpoints use cookie-based auth
- [ ] Token type enforcement working
- [ ] Permission checks working
- [ ] Role checks working
- [ ] Product access checks working
- [ ] Zero 401/403 errors in logs (except expected denials)
- [ ] Documentation complete
- [ ] Team trained on new system
- [ ] Production deployment successful
- [ ] No regressions reported

---

## Support and Resources

- **Documentation:** [RBAC_IMPLEMENTATION_GUIDE.md](./RBAC_IMPLEMENTATION_GUIDE.md)
- **Quick Reference:** [RBAC_QUICK_REFERENCE.md](./RBAC_QUICK_REFERENCE.md)
- **Code Examples:** See `backend/src/middleware/auth.js`
- **Test Examples:** See `backend/tests/integration/rbac-*.test.js`

---

**Last Updated:** November 21, 2025
