# RBAC Implementation - Remaining Tasks

## Current Status
✅ **Phase 1 Complete**: Database migrations, permission seeds, role seeds
✅ **Phase 2 Partial**: Models created (Permission, Role, UserRole, RoleAuditLog)

## Next Steps to Complete RBAC Implementation

### IMMEDIATE PRIORITY: Phase 2 - Services Layer

Create these service files with Joi validation:

#### 1. RoleService (`backend/src/modules/rbac/services/RoleService.js`)
```javascript
import Joi from 'joi';
import Role from '../models/Role.js';
import RoleAuditLog from '../models/RoleAuditLog.js';
import logger from '../../../utils/logger.js';

class RoleService {
  static createSchema = Joi.object({
    name: Joi.string().required().min(2).max(100),
    display_name: Joi.string().optional(),
    description: Joi.string().optional().max(500),
    product: Joi.string().optional().valid('paylinq', 'nexus', 'schedulehub', 'recruitiq'),
    permissionIds: Joi.array().items(Joi.string().uuid()).default([])
  });

  async create(data, organizationId, userId) { /* ... */ }
  async getById(id, organizationId) { /* ... */ }
  async list(organizationId, filters) { /* ... */ }
  async update(id, data, organizationId, userId) { /* ... */ }
  async delete(id, organizationId, userId) { /* ... */ }
  async assignPermissions(roleId, permissionIds, organizationId, userId) { /* ... */ }
}
export default RoleService;
```

#### 2. UserRoleService (`backend/src/modules/rbac/services/UserRoleService.js`)
```javascript
import Joi from 'joi';
import UserRole from '../models/UserRole.js';
import Role from '../models/Role.js';
import RoleAuditLog from '../models/RoleAuditLog.js';

class UserRoleService {
  static assignSchema = Joi.object({
    userId: Joi.string().uuid().required(),
    roleId: Joi.string().uuid().required(),
    product: Joi.string().optional().valid('paylinq', 'nexus', 'schedulehub', 'recruitiq')
  });

  async assignRole(data, organizationId, assignedBy) { /* ... */ }
  async revokeRole(userId, roleId, product, organizationId, revokedBy) { /* ... */ }
  async getUserRoles(userId, organizationId, product) { /* ... */ }
  async getUserPermissions(userId, organizationId, product) { /* ... */ }
  async checkPermission(userId, permissionCode, organizationId, product) { /* ... */ }
}
export default UserRoleService;
```

#### 3. PermissionService (`backend/src/modules/rbac/services/PermissionService.js`)
```javascript
import Permission from '../models/Permission.js';

class PermissionService {
  async list(filters) { /* ... */ }
  async getGrouped() { /* ... */ }
  async getByProduct(product) { /* ... */ }
}
export default PermissionService;
```

### Phase 3: Middleware Updates

#### Update `backend/src/middleware/auth.js`

**Key changes:**
1. In `authenticateTenant`, load RBAC permissions:
```javascript
// After getting user from database
const userRoleService = new UserRoleService();
const permissions = await userRoleService.getUserPermissions(user.id, user.organization_id);

req.user = {
  // ... existing fields
  permissions: permissions.map(p => p.code),
  permissionsDetails: permissions
};
```

2. Update `requirePermission()` to check req.user.permissions array

3. Add `requireAllPermissions()`:
```javascript
export function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    const hasAll = permissions.every(perm => 
      req.user.permissions.includes(perm)
    );
    if (!hasAll) return res.status(403).json({...});
    next();
  };
}
```

#### Create RBAC-specific middleware (`backend/src/modules/rbac/middleware/rbacEnforcement.js`)
```javascript
export function requireRBACManagement(req, res, next) {
  if (!req.user.permissions.includes('rbac:manage')) {
    return res.status(403).json({...});
  }
  next();
}

export async function preventSystemRoleModification(req, res, next) {
  const roleId = req.params.id || req.params.roleId;
  // Check if role is system role, block if true
}
```

### Phase 4: Controllers & Routes

#### 1. Create Controllers
- `backend/src/modules/rbac/controllers/permissionController.js` (list permissions)
- `backend/src/modules/rbac/controllers/roleController.js` (CRUD)
- `backend/src/modules/rbac/controllers/userRoleController.js` (assign/revoke)

#### 2. Create Routes
- `backend/src/modules/rbac/routes/index.js` - Main router
- Mount in `backend/src/server.js`:
```javascript
import rbacRoutes from './modules/rbac/routes/index.js';
app.use('/api/rbac', rbacRoutes);
```

### Phase 5: Product Route Integration

Update routes in each product to use permission checks:

#### PayLinQ Example:
```javascript
// backend/src/products/paylinq/routes/payrollRuns.js
import { authenticateTenant, requireProductAccess, requirePermission } from '../../../middleware/auth.js';

router.use(authenticateTenant);
router.use(requireProductAccess('paylinq'));

router.get('/', requirePermission('payroll:run:view'), listPayrollRuns);
router.post('/', requirePermission('payroll:run:create'), createPayrollRun);
router.post('/:id/approve', requirePermission('payroll:run:approve'), approvePayrollRun);
```

### Phase 6: Testing

#### 1. Unit Tests for Models
```javascript
// backend/tests/unit/modules/rbac/models/Role.test.js
describe('Role Model', () => {
  test('create - should create new role', async () => {
    const role = await Role.create(data, orgId, userId);
    expect(role).toBeDefined();
  });
});
```

#### 2. Integration Tests
```javascript
// backend/tests/integration/rbac/roles.test.js
describe('RBAC - Roles API', () => {
  test('POST /api/rbac/roles - should create role with permissions', async () => {
    const res = await request(app)
      .post('/api/rbac/roles')
      .set('Cookie', [`tenant_access_token=${token}`])
      .send(roleData)
      .expect(201);
  });
});
```

### Phase 7: Migration Data

Create migration script to populate user_roles from existing product_roles JSONB:

```javascript
// backend/src/database/migrations/20251122000004_migrate_product_roles.js
export async function up(db) {
  // Get all users with product_roles
  const users = await db.query(`
    SELECT id, organization_id, product_roles
    FROM hris.user_account
    WHERE product_roles IS NOT NULL
  `);

  for (const user of users) {
    // For each product in product_roles
    for (const [product, roleName] of Object.entries(user.product_roles)) {
      // Find matching role
      const role = await db.query(`
        SELECT id FROM roles 
        WHERE name = $1 AND (product = $2 OR product IS NULL)
      `, [roleName, product]);

      // Assign role
      if (role) {
        await db.query(`
          INSERT INTO user_roles (user_id, role_id, product)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [user.id, role.id, product]);
      }
    }
  }
}
```

## Quick Command Reference

### Run Migrations
```bash
cd backend
# If you have a migration runner:
node src/database/migrate.js up

# Or manually with psql:
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000001_enhance_rbac_system.sql
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000002_seed_rbac_permissions.sql
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000003_seed_roles_permissions.sql
```

### Verify Data
```sql
-- Check permissions
SELECT product, category, COUNT(*) as count
FROM permissions
WHERE is_active = true
GROUP BY product, category
ORDER BY product, category;

-- Check roles
SELECT name, display_name, product, level
FROM roles
WHERE deleted_at IS NULL
ORDER BY level DESC;

-- Check role-permission mappings
SELECT r.name, COUNT(rp.permission_id) as perm_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY perm_count DESC;
```

## Implementation Priority Order

1. **Services** (RoleService, UserRoleService, PermissionService)
2. **Middleware Updates** (Update auth.js, create rbacEnforcement.js)
3. **Controllers** (permissionController, roleController, userRoleController)
4. **Routes** (Create and mount RBAC routes)
5. **Product Integration** (Update PayLinQ, Nexus, RecruitIQ, ScheduleHub routes)
6. **Testing** (Unit tests for models/services, integration tests for API)
7. **Data Migration** (Migrate existing product_roles to user_roles)
8. **Documentation** (API docs, usage guide)

## Key Standards to Follow

From `docs/BACKEND_STANDARDS.md`:
- ✅ Export classes, not singleton instances (for dependency injection)
- ✅ Use static Joi schemas in services
- ✅ ALWAYS include organizationId in queries (tenant isolation)
- ✅ Use custom `query()` wrapper, never `pool.query()`
- ✅ Follow 4-layer architecture: Routes → Controllers → Services → Repositories
- ✅ Validate with Joi at service layer (fail fast)
- ✅ Use resource-specific response keys (e.g., `{success: true, role: ...}`)

## Common Pitfalls to Avoid

❌ Don't skip organizationId filtering
❌ Don't export singleton services
❌ Don't use generic "data" key in responses
❌ Don't put business logic in controllers
❌ Don't skip Joi validation
❌ Don't hard delete (use soft deletes)
❌ Don't forget audit logging
❌ Don't assume method names without reading source

## Files Created So Far

### Migrations
- ✅ `backend/src/database/migrations/20251122000001_enhance_rbac_system.sql`
- ✅ `backend/src/database/migrations/20251122000002_seed_rbac_permissions.sql`
- ✅ `backend/src/database/migrations/20251122000003_seed_roles_permissions.sql`

### Models
- ✅ `backend/src/modules/rbac/models/Permission.js`
- ✅ `backend/src/modules/rbac/models/Role.js`
- ✅ `backend/src/modules/rbac/models/UserRole.js`
- ✅ `backend/src/modules/rbac/models/RoleAuditLog.js`

### Directory Structure Created
- ✅ `backend/src/modules/rbac/models/`
- ✅ `backend/src/modules/rbac/services/`
- ✅ `backend/src/modules/rbac/controllers/`
- ✅ `backend/src/modules/rbac/routes/`
- ✅ `backend/src/modules/rbac/middleware/`
- ✅ `backend/src/modules/rbac/dto/`
- ✅ `backend/src/modules/rbac/validators/`
- ✅ `backend/src/modules/rbac/utils/`

## Next Session Plan

1. Create Services (RoleService, UserRoleService, PermissionService)
2. Update auth middleware to load permissions
3. Create controllers
4. Create routes and mount in server
5. Test basic RBAC flow

This foundational work enables the entire RBAC system!
