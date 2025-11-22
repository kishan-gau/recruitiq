# RBAC Architecture Correction: Portal vs Tenant Separation

**Date:** November 22, 2025  
**Issue:** Incorrect assumption that Portal manages tenant users  
**Resolution:** Clear separation between platform and tenant RBAC

---

## The Problem

Initial implementation incorrectly assumed Portal would manage user role assignments for tenant applications (Nexus, PayLinQ, etc.). This violated multi-tenant architecture principles:

❌ **Wrong Assumption:**
- Portal manages users across all tenant organizations
- Portal assigns roles to tenant users
- Portal has visibility into tenant user data

**Why This is Wrong:**
- Violates data isolation principles
- Portal should never know about tenant users
- Each organization's data must be isolated
- Breaks multi-tenant security model

---

## The Correct Architecture

### Portal (Platform Admin)

**Purpose:** Manage the platform itself, not tenant data

**Manages:**
- ✅ Platform administrators (portal users)
- ✅ System roles (for platform admins)
- ✅ Role templates (that tenants can adopt)
- ✅ Customer/organization records
- ✅ License management
- ✅ Platform configuration

**Does NOT manage:**
- ❌ Tenant users
- ❌ Tenant role assignments
- ❌ Tenant-specific permissions
- ❌ Organization-internal RBAC

**API Endpoints:**
```
GET  /api/rbac/permissions?scope=platform
GET  /api/rbac/roles?scope=platform
POST /api/rbac/roles/templates
GET  /api/rbac/roles/templates
```

### Tenant Apps (Nexus, PayLinQ, RecruitIQ, ScheduleHub)

**Purpose:** Each organization manages its own users and roles

**Each Organization Manages:**
- ✅ Their own users (within their organization)
- ✅ Role assignments for their users
- ✅ Custom roles specific to their needs
- ✅ Permission grants for their team

**Cannot Access:**
- ❌ Other organizations' users
- ❌ Platform admin functions
- ❌ Cross-organization data

**API Endpoints:**
```
GET    /api/products/nexus/rbac/roles
POST   /api/products/nexus/rbac/roles
GET    /api/products/nexus/rbac/users/{userId}/roles
POST   /api/products/nexus/rbac/users/{userId}/roles
DELETE /api/products/nexus/rbac/users/{userId}/roles/{roleId}
GET    /api/products/nexus/users  // Organization users only
```

---

## Implementation Changes

### Before (Incorrect)

```typescript
// ❌ Portal managing tenant users
// apps/portal/src/services/rbac.service.ts
export const rbacService = {
  async assignRoleToUser(userId, roleId) {
    // This would assign roles to ANY user in ANY organization
    await apiClient.post('/api/rbac/user-roles', { userId, roleId });
  },
  
  async getUserRoles(userId) {
    // Portal shouldn't query tenant user roles
    await apiClient.get(`/api/rbac/user-roles/${userId}`);
  }
};
```

### After (Correct)

```typescript
// ✅ Portal manages platform ONLY
// apps/portal/src/services/rbac.service.ts
export const platformRbacService = {
  async getSystemRoles() {
    // Only system/platform roles
    await apiClient.get('/api/rbac/roles?scope=platform');
  },
  
  async createRoleTemplate(data) {
    // Templates for tenants to use
    await apiClient.post('/api/rbac/roles/templates', data);
  }
};

// ✅ Tenant apps manage their own users
// apps/nexus/src/services/rbac.service.ts
import { createTenantRbacService } from '@recruitiq/auth';
export const nexusRbacService = createTenantRbacService('nexus');

// Usage in Nexus
await nexusRbacService.assignRoleToUser(userId, roleId); // Scoped to org
await nexusRbacService.getRoles(); // Only org roles
await nexusRbacService.getOrganizationUsers(); // Only org users
```

---

## Data Isolation Guarantees

### Backend Enforcement

All tenant RBAC endpoints MUST enforce organization isolation:

```javascript
// Backend: Product RBAC route
router.post('/api/products/:product/rbac/users/:userId/roles',
  authenticate,
  async (req, res) => {
    const { organizationId } = req.user; // From JWT
    const { userId } = req.params;
    const { roleId } = req.body;
    
    // 1. Verify user belongs to organization
    const user = await UserRepository.findById(userId, organizationId);
    if (!user) {
      return res.status(403).json({ error: 'User not found in your organization' });
    }
    
    // 2. Verify role belongs to organization
    const role = await RoleRepository.findById(roleId, organizationId);
    if (!role) {
      return res.status(403).json({ error: 'Role not found in your organization' });
    }
    
    // 3. Assign role (scoped to organization)
    await UserRoleService.assignRole(userId, roleId, organizationId);
    
    res.json({ success: true });
  }
);
```

### Frontend Isolation

```typescript
// Tenant apps can ONLY access their organization's data
const nexusRbacService = createTenantRbacService('nexus');

// All these are automatically scoped to organizationId
await nexusRbacService.getOrganizationUsers(); // Only org users
await nexusRbacService.getRoles(); // Only org roles
await nexusRbacService.assignRoleToUser(userId, roleId); // Validated by backend
```

---

## Use Case Examples

### Use Case 1: Create Custom Role in Organization

**Actor:** HR Manager in Organization A (using Nexus)

```typescript
// Nexus app
import { nexusRbacService } from '@/services/rbac.service';

async function createCustomRole() {
  // Get available permissions for Nexus
  const permissions = await nexusRbacService.getGroupedPermissions();
  
  // Create role for this organization
  const role = await nexusRbacService.createRole({
    name: 'department_head',
    display_name: 'Department Head',
    description: 'Can manage department employees',
    permissionIds: [
      'employee:view',
      'employee:edit',
      'attendance:view',
      'attendance:approve'
    ]
  });
  
  // Role is scoped to Organization A
  // Organization B cannot see or use this role
}
```

### Use Case 2: Assign Role to User

**Actor:** Admin in Organization B (using PayLinQ)

```typescript
// PayLinQ app
import { createTenantRbacService } from '@recruitiq/auth';
const paylinqRbacService = createTenantRbacService('paylinq');

async function assignPayrollRole(userId) {
  // Get organization's users
  const users = await paylinqRbacService.getOrganizationUsers();
  
  // Verify user exists in organization
  const user = users.find(u => u.id === userId);
  if (!user) {
    throw new Error('User not in organization');
  }
  
  // Get organization's roles
  const roles = await paylinqRbacService.getRoles();
  const payrollManagerRole = roles.find(r => r.name === 'payroll_manager');
  
  // Assign role (backend validates organization ownership)
  await paylinqRbacService.assignRoleToUser(userId, payrollManagerRole.id);
  
  // This ONLY affects Organization B
  // Organization A is completely unaware of this action
}
```

### Use Case 3: Portal Creates Role Template

**Actor:** Platform Admin (using Portal)

```typescript
// Portal app
import { platformRbacService } from '@/services';

async function createRoleTemplate() {
  // Create template that ANY tenant can use
  const template = await platformRbacService.createRoleTemplate({
    name: 'payroll_viewer',
    display_name: 'Payroll Viewer',
    description: 'Can view payroll data (read-only)',
    product: 'paylinq',
    permissionIds: [
      'payroll:run:view',
      'payroll:component:view'
    ]
  });
  
  // Now all organizations can use this template
  // But each organization's instance is isolated
}
```

---

## Migration Checklist

- [x] Rename Portal `rbacService` to `platformRbacService`
- [x] Remove tenant user management from Portal service
- [x] Create `createTenantRbacService()` factory in `@recruitiq/auth`
- [x] Add example Nexus RBAC service
- [x] Update documentation to reflect separation
- [x] Add clear architectural diagrams
- [x] Document use cases for each layer

**Next Steps:**
- [ ] Implement Portal platform RBAC UI (system roles, templates)
- [ ] Implement tenant RBAC UI in each app (user roles, assignments)
- [ ] Add backend validation for organization isolation
- [ ] Add integration tests for cross-org access prevention

---

## Key Takeaways

1. **Portal ≠ Tenant Manager**
   - Portal manages the platform itself
   - Portal has no knowledge of tenant users
   - Portal provides templates and tools

2. **Each Tenant is Isolated**
   - Organizations manage their own users
   - Roles are scoped to organizationId
   - No cross-organization visibility

3. **Backend Must Enforce Isolation**
   - Always validate organizationId
   - Use JWT claims for tenant identification
   - Return 403 for cross-org access attempts

4. **Frontend Reflects Backend Reality**
   - Use product-specific API paths
   - Service factories create org-scoped clients
   - UI only shows org-specific data

---

## References

- [FRONTEND_RBAC_IMPLEMENTATION.md](./FRONTEND_RBAC_IMPLEMENTATION.md) - Updated with correct architecture
- [RBAC_IMPLEMENTATION_PLAN.md](./RBAC_IMPLEMENTATION_PLAN.md) - Original plan (needs update)
- Multi-tenant SaaS best practices (OWASP, NIST guidelines)
