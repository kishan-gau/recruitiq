# RBAC System - Implementation Complete

## Overview

This document describes the fully implemented Role-Based Access Control (RBAC) system for the RecruitIQ platform, supporting PayLinQ, Nexus, ScheduleHub, and RecruitIQ products with organization-scoped, fine-grained permissions.

## Architecture

### Database Schema

**Core Tables:**
- `permissions` - System-defined permissions (76 total across all products)
- `roles` - Organization-scoped roles with product context
- `role_permissions` - Many-to-many mapping between roles and permissions
- `user_roles` - User role assignments with product context
- `role_audit_log` - Complete audit trail for all RBAC changes

**Key Features:**
- Organization-level data isolation
- Product-specific role assignments
- Soft deletes for audit trail
- System vs. custom roles
- Full audit logging

### Permission Structure

Permissions follow the format: `resource:action`

**Global Permissions (12):**
- `user:view`, `user:create`, `user:edit`, `user:delete`, `user:reset_password`
- `rbac:view`, `rbac:manage`, `rbac:assign`
- `org:settings:view`, `org:settings:edit`

**PayLinQ Permissions (17):**
- Payroll runs: `payroll:run:view`, `payroll:run:create`, `payroll:run:edit`, `payroll:run:approve`, `payroll:run:process`, `payroll:run:delete`
- Components: `payroll:component:view`, `payroll:component:manage`
- Workers: `payroll:worker:view`, `payroll:worker:edit`
- Time: `payroll:time:view`, `payroll:time:approve`
- Reports: `payroll:reports:view`, `payroll:reports:export`
- Settings: `payroll:settings:view`, `payroll:settings:manage`

**Nexus Permissions (24):**
- Employees: `employee:view`, `employee:create`, `employee:edit`, `employee:terminate`, `employee:delete`
- Attendance: `attendance:view`, `attendance:record`, `attendance:approve`
- Time Off: `timeoff:view`, `timeoff:request`, `timeoff:approve`
- Benefits: `benefits:view`, `benefits:enroll`, `benefits:manage`
- Documents: `documents:view`, `documents:upload`, `documents:delete`
- Departments: `dept:view`, `dept:manage`
- Locations: `location:view`, `location:manage`
- Performance: `performance:view`, `performance:manage`
- Reports: `hris:reports:view`, `hris:reports:export`

**RecruitIQ Permissions (15):**
- Jobs: `job:view`, `job:create`, `job:edit`, `job:publish`, `job:close`, `job:delete`
- Candidates: `candidate:view`, `candidate:edit`, `candidate:delete`
- Applications: `application:view`, `application:review`, `application:reject`
- Interviews: `interview:view`, `interview:schedule`, `interview:conduct`
- Reports: `ats:reports:view`, `ats:reports:export`

**ScheduleHub Permissions (8):**
- Schedules: `schedule:view`, `schedule:create`, `schedule:edit`, `schedule:publish`
- Stations: `station:view`, `station:manage`
- Shifts: `shift:view`, `shift:swap`
- Reports: `scheduling:reports:view`

### System Roles

**Global Roles:**
- `super_admin` (Level 100) - Platform administrators, all permissions
- `org_owner` (Level 90) - Organization owners, full organizational access
- `org_admin` (Level 80) - Organization administrators
- `manager` (Level 50) - Team managers
- `user` (Level 30) - Standard users
- `viewer` (Level 10) - Read-only access

**Product-Specific Roles:**
- PayLinQ: `payroll_admin`, `payroll_processor`, `payroll_viewer`
- Nexus: `hr_admin`, `hr_manager`, `hr_viewer`
- RecruitIQ: `recruitment_admin`, `recruiter`, `hiring_manager`
- ScheduleHub: `schedule_admin`, `scheduler`, `shift_worker`

## API Endpoints

### RBAC Management API

Base path: `/api/rbac`

**Permissions:**
```bash
# List all permissions
GET /api/rbac/permissions
GET /api/rbac/permissions?product=paylinq&category=payroll_runs

# Get grouped permissions
GET /api/rbac/permissions/grouped

# Get permissions by product
GET /api/rbac/permissions/product/paylinq
```

**Roles:**
```bash
# List roles
GET /api/rbac/roles
GET /api/rbac/roles?product=paylinq&isActive=true

# Get role with permissions
GET /api/rbac/roles/:id

# Create role (requires rbac:manage permission)
POST /api/rbac/roles
{
  "name": "custom_role",
  "display_name": "Custom Role",
  "description": "Custom role for...",
  "product": "paylinq",
  "permissionIds": ["uuid1", "uuid2"]
}

# Update role (requires rbac:manage permission)
PATCH /api/rbac/roles/:id
{
  "display_name": "Updated Name",
  "isActive": true
}

# Delete role (requires rbac:manage permission)
DELETE /api/rbac/roles/:id

# Assign permissions to role (requires rbac:manage permission)
POST /api/rbac/roles/:id/permissions
{
  "permissionIds": ["uuid1", "uuid2", "uuid3"]
}
```

**User Roles:**
```bash
# Assign role to user (requires user:edit or rbac:assign permission)
POST /api/rbac/user-roles
{
  "userId": "user-uuid",
  "roleId": "role-uuid",
  "product": "paylinq"
}

# Revoke role from user (requires user:edit or rbac:assign permission)
DELETE /api/rbac/user-roles
{
  "userId": "user-uuid",
  "roleId": "role-uuid",
  "product": "paylinq"
}

# Bulk assign roles (requires user:edit or rbac:assign permission)
POST /api/rbac/user-roles/bulk-assign
{
  "userId": "user-uuid",
  "roleAssignments": [
    { "roleId": "role1-uuid", "product": "paylinq" },
    { "roleId": "role2-uuid", "product": "nexus" }
  ]
}

# Get user roles
GET /api/rbac/user-roles/:userId
GET /api/rbac/user-roles/:userId?product=paylinq

# Get users with specific role
GET /api/rbac/roles/:roleId/users

# Get user permissions
GET /api/rbac/user-roles/:userId/permissions
GET /api/rbac/user-roles/:userId/permissions?product=paylinq

# Check if user has permission
POST /api/rbac/user-roles/check-permission
{
  "userId": "user-uuid",
  "permissionCode": "payroll:run:approve",
  "product": "paylinq"
}
```

## Usage Examples

### Backend - Protecting Routes

```javascript
import { authenticateTenant, requireProductAccess, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require tenant authentication and product access
router.use(authenticateTenant);
router.use(requireProductAccess('paylinq'));

// View permissions - user needs 'payroll:run:view' permission
router.get('/payroll-runs', 
  requirePermission('payroll:run:view'), 
  listPayrollRuns
);

// Create permissions - user needs 'payroll:run:create' permission
router.post('/payroll-runs', 
  requirePermission('payroll:run:create'), 
  createPayrollRun
);

// Approve permissions - user needs 'payroll:run:approve' permission
router.post('/payroll-runs/:id/approve', 
  requirePermission('payroll:run:approve'), 
  approvePayrollRun
);

// Multiple permissions (OR logic) - user needs ANY of these permissions
router.get('/reports', 
  requirePermission('payroll:reports:view', 'hris:reports:view'), 
  getReports
);
```

### Backend - Checking Permissions in Code

```javascript
// User object automatically populated by authenticateTenant middleware
if (req.user.permissions.includes('payroll:run:approve')) {
  // User can approve payroll runs
}

// Using UserRoleService
import UserRoleService from '../modules/rbac/services/UserRoleService.js';

const userRoleService = new UserRoleService();
const hasPermission = await userRoleService.checkPermission(
  userId,
  'payroll:run:approve',
  organizationId,
  'paylinq'
);
```

### Frontend - Conditional Rendering

```javascript
// User permissions available in AuthContext
const { user } = useAuth();

// Check permission
const canApprove = user.permissions?.includes('payroll:run:approve');

// Conditional rendering
{canApprove && (
  <Button onClick={approvePayrollRun}>
    Approve Payroll
  </Button>
)}

// Using role-based check (backward compatible)
const isAdmin = user.productRoles?.paylinq === 'payroll_admin';
```

## Middleware Reference

### Authentication Middleware

**`authenticateTenant`**
- Verifies tenant JWT token
- Loads user from database
- **NEW:** Loads RBAC permissions via UserRoleService
- Attaches `req.user` with permissions array

**`authenticatePlatform`**
- Verifies platform JWT token
- For portal/admin users only

### Authorization Middleware

**`requirePermission(...permissions)`**
- Checks if user has ANY of the specified permissions (OR logic)
- Example: `requirePermission('payroll:run:view', 'payroll:run:edit')`

**`requireAllPermissions(...permissions)`**
- Checks if user has ALL specified permissions (AND logic)
- Example: `requireAllPermissions('payroll:run:edit', 'payroll:run:approve')`

**`checkPermission(...permissions)`**
- Optional check, doesn't block request
- Attaches `req.hasPermission` boolean

**RBAC Enforcement:**
- `requireRBACManagement` - Requires 'rbac:manage' permission
- `requireUserManagement` - Requires 'user:edit' or 'rbac:assign'
- `preventSystemRoleModification` - Blocks system role changes
- `validateProductContext` - Validates product parameters

## Migration from Legacy System

### Step 1: Run Database Migrations

```bash
cd backend
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000001_enhance_rbac_system.sql
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000002_seed_rbac_permissions.sql
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000003_seed_roles_permissions.sql
psql -U postgres -d recruitiq_db -f src/database/migrations/20251122000004_migrate_product_roles_to_user_roles.sql
```

### Step 2: Verify Migration

```sql
-- Check permissions seeded
SELECT product, category, COUNT(*) 
FROM permissions 
WHERE is_active = true 
GROUP BY product, category;

-- Check roles created
SELECT name, display_name, product, level 
FROM roles 
WHERE deleted_at IS NULL 
ORDER BY level DESC;

-- Check role-permission mappings
SELECT r.name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY permission_count DESC;

-- Check user role assignments
SELECT COUNT(*) FROM user_roles WHERE revoked_at IS NULL;
```

### Step 3: Update Routes

Routes are already updated in:
- `backend/src/products/paylinq/routes/payrollRuns.js`
- `backend/src/products/nexus/routes/index.js`
- `backend/src/routes/jobs.js`

Other routes can be gradually updated following the same pattern.

## Security Considerations

✅ **Organization Isolation:** All queries filter by organization_id
✅ **Token Type Enforcement:** Platform vs. Tenant tokens strictly separated
✅ **Permission Caching:** Loaded once per request, cached in req.user
✅ **Audit Trail:** All role/permission changes logged in role_audit_log
✅ **System Role Protection:** System roles cannot be modified or deleted
✅ **Backward Compatible:** Falls back to product_roles JSONB if user_roles empty

## Testing

```bash
# Run all tests
cd backend
npm test

# Run RBAC-specific tests
npm test -- rbac

# Run integration tests
npm test:integration
```

## Troubleshooting

**User has no permissions after migration:**
- Check if user_roles were created: `SELECT * FROM user_roles WHERE user_id = 'uuid'`
- Check product_roles JSONB: `SELECT product_roles FROM hris.user_account WHERE id = 'uuid'`
- Verify role exists: `SELECT * FROM roles WHERE name = 'role_name'`

**Permission check failing:**
- Verify permission exists: `SELECT * FROM permissions WHERE name = 'permission:code'`
- Check user's roles: `SELECT * FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = 'uuid'`
- Check role has permission: `SELECT * FROM role_permissions WHERE role_id = 'role-uuid'`

**System role modification error:**
- Verify role is not a system role: `SELECT is_system FROM roles WHERE id = 'uuid'`
- System roles have `is_system = true` and cannot be modified

## Maintenance

### Adding New Permissions

1. Add to `seed_rbac_permissions.sql`
2. Run migration
3. Assign to appropriate roles in `seed_roles_permissions.sql`
4. Update routes to use new permission

### Creating Custom Roles

```bash
POST /api/rbac/roles
{
  "name": "custom_role_name",
  "display_name": "Custom Role Display Name",
  "description": "Description of this role",
  "product": "paylinq", # or null for global
  "permissionIds": ["uuid1", "uuid2", ...]
}
```

### Assigning Roles to Users

```bash
POST /api/rbac/user-roles
{
  "userId": "user-uuid",
  "roleId": "role-uuid",
  "product": "paylinq" # optional, null for global roles
}
```

## Files Reference

**Migrations:**
- `backend/src/database/migrations/20251122000001_enhance_rbac_system.sql`
- `backend/src/database/migrations/20251122000002_seed_rbac_permissions.sql`
- `backend/src/database/migrations/20251122000003_seed_roles_permissions.sql`
- `backend/src/database/migrations/20251122000004_migrate_product_roles_to_user_roles.sql`

**Models:**
- `backend/src/modules/rbac/models/Permission.js`
- `backend/src/modules/rbac/models/Role.js`
- `backend/src/modules/rbac/models/UserRole.js`
- `backend/src/modules/rbac/models/RoleAuditLog.js`

**Services:**
- `backend/src/modules/rbac/services/PermissionService.js`
- `backend/src/modules/rbac/services/RoleService.js`
- `backend/src/modules/rbac/services/UserRoleService.js`

**Middleware:**
- `backend/src/middleware/auth.js` (enhanced with RBAC)
- `backend/src/modules/rbac/middleware/rbacEnforcement.js`

**Controllers:**
- `backend/src/modules/rbac/controllers/permissionController.js`
- `backend/src/modules/rbac/controllers/roleController.js`
- `backend/src/modules/rbac/controllers/userRoleController.js`

**Routes:**
- `backend/src/modules/rbac/routes/index.js`

## Support

For questions or issues, refer to:
- `docs/rbac/` - Original RBAC specification
- `docs/RBAC_IMPLEMENTATION_STATUS.md` - Implementation status and remaining tasks
- `docs/BACKEND_STANDARDS.md` - Coding standards
- `docs/TESTING_STANDARDS.md` - Testing guidelines
