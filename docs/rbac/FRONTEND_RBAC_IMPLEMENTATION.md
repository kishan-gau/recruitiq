# Frontend RBAC Implementation Guide

**Status:** Phase 1 Complete - Shared Foundation  
**Branch:** `feature/frontend-rbac-integration`  
**Last Updated:** November 22, 2025

---

## Overview

Frontend RBAC integration follows a **hybrid architecture** with **clear separation of concerns**:
- **80% Shared Foundation** - Core components and hooks in `packages/`
- **20% App-Specific** - Custom UI per product in `apps/`

### Critical Architecture Principle

**Portal vs Tenant Apps Separation:**

```
┌─────────────────────────────────────────────────────────────┐
│                        PORTAL                               │
│  (Platform Admin - manages the platform itself)            │
│                                                             │
│  Manages:                                                   │
│  ✅ Platform admins (portal users)                         │
│  ✅ System roles (for platform admins)                     │
│  ✅ Role templates (that tenants can use)                  │
│  ✅ License management                                      │
│  ✅ Customer/organization management                        │
│                                                             │
│  Does NOT manage:                                          │
│  ❌ Tenant users (those belong to tenant orgs)            │
│  ❌ Tenant role assignments                                │
│  ❌ Tenant-specific permissions                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              TENANT APPS (Nexus, PayLinQ, etc.)             │
│  (Tenant-specific - each org manages its own users)        │
│                                                             │
│  Each organization manages:                                 │
│  ✅ Their own users                                         │
│  ✅ Role assignments for their users                        │
│  ✅ Custom roles within their organization                  │
│  ✅ Permission grants for their team                        │
│                                                             │
│  Cannot access:                                            │
│  ❌ Other organizations' users                             │
│  ❌ Platform admin functions                               │
│  ❌ Cross-organization data                                │
└─────────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- **Data Isolation** - Tenant users are isolated per organization
- **Security** - Portal has no knowledge of tenant users
- **Scalability** - Each organization manages its own RBAC
- **Compliance** - Proper multi-tenant data separation

---

## Architecture

### Shared Foundation (packages/)

#### @recruitiq/auth Package

**Hooks for Permission Checking:**

```typescript
// Core permission hook
const { 
  permissions,           // string[] - All user permissions
  hasPermission,         // (permission: string) => boolean
  hasAnyPermission,      // (...permissions: string[]) => boolean
  hasAllPermissions,     // (...permissions: string[]) => boolean
  isLoading              // boolean - Loading state
} = usePermissions();

// Simplified single permission check
const canApprove = useHasPermission('payroll:run:approve');

// Batch permission checking
const checks = useCheckPermissions([
  'payroll:run:view',
  'payroll:run:create',
  'payroll:run:approve',
]);
// Returns: { 'payroll:run:view': true, 'payroll:run:create': false, ... }
```

**Location:** `packages/auth/src/hooks/`
- `usePermissions.ts` - Core permission checking
- `useHasPermission.ts` - Single permission check
- `useCheckPermissions.ts` - Batch permission checking

#### @recruitiq/ui Package

**Components for Conditional Rendering:**

```tsx
// 1. PermissionGate - Most flexible
<PermissionGate 
  permission="payroll:run:approve"
  fallback={<UpgradePrompt />}
>
  <ApproveButton />
</PermissionGate>

// ANY of multiple permissions (OR logic)
<PermissionGate requireAny={['job:create', 'job:edit', 'job:delete']}>
  <JobManagementPanel />
</PermissionGate>

// ALL of multiple permissions (AND logic)
<PermissionGate requireAll={['payroll:run:edit', 'payroll:run:approve']}>
  <FullAccessPanel />
</PermissionGate>

// 2. HasPermission - Simpler alternative
<HasPermission permission="payroll:run:approve">
  <ApproveButton />
</HasPermission>

// 3. HasAnyPermission - OR logic
<HasAnyPermission permissions={['job:create', 'job:edit']}>
  <JobForm />
</HasAnyPermission>

// 4. HasAllPermissions - AND logic
<HasAllPermissions permissions={['admin:access', 'admin:manage']}>
  <AdminPanel />
</HasAllPermissions>

// 5. AccessDenied - Generic permission denied page
<AccessDenied 
  title="Payroll Access Required"
  message="You need payroll approval permissions."
  missingPermissions={['payroll:run:approve']}
  showContactAdmin
/>
```

**Location:** `packages/ui/src/components/`
- `PermissionGate.tsx` - Main conditional rendering wrapper
- `HasPermission.tsx` - Simple permission check
- `HasAnyPermission.tsx` - OR logic wrapper
- `HasAllPermissions.tsx` - AND logic wrapper
- `AccessDenied.tsx` - Generic access denied page

### RBAC Services

#### Platform Service (Portal Only)

**For Portal admin - manages platform-level RBAC:**

```typescript
// apps/portal/src/services/rbac.service.ts
import { platformRbacService } from './services';

// Get system roles (for platform admins)
const systemRoles = await platformRbacService.getSystemRoles();

// Create role template (for tenants to use)
await platformRbacService.createRoleTemplate({
  name: 'payroll_manager',
  display_name: 'Payroll Manager',
  product: 'paylinq',
  permissionIds: ['payroll:run:view', 'payroll:run:create']
});

// Get system permissions
const platformPermissions = await platformRbacService.getSystemPermissions();
```

#### Tenant Service (Product Apps)

**For tenant apps - manages organization users:**

```typescript
// apps/nexus/src/services/rbac.service.ts
import { createTenantRbacService } from '@recruitiq/auth';

const nexusRbacService = createTenantRbacService('nexus');

// Get roles for current organization
const roles = await nexusRbacService.getRoles();

// Assign role to user in organization
await nexusRbacService.assignRoleToUser(userId, roleId);

// Create custom role for organization
await nexusRbacService.createRole({
  name: 'hr_manager',
  display_name: 'HR Manager',
  permissionIds: ['employee:view', 'employee:edit']
});

// Get organization users (for role assignment UI)
const users = await nexusRbacService.getOrganizationUsers();
```

**Key Differences:**

| Feature | Portal (Platform) | Tenant Apps |
|---------|------------------|-------------|
| Users | Platform admins only | Organization users |
| Roles | System roles + Templates | Organization roles |
| Scope | Platform-wide | Organization-scoped |
| API Path | `/api/rbac/*` | `/api/products/{slug}/rbac/*` |
| Purpose | Manage platform | Manage tenant users |

### Route Protection

**ProtectedRoute already supports permissions:**

```tsx
import { ProtectedRoute } from '@recruitiq/auth';

// Protect route with permission
<Route 
  path="/payroll/approve" 
  element={
    <ProtectedRoute requirePermission="payroll:run:approve">
      <PayrollApprovalPage />
    </ProtectedRoute>
  } 
/>

// Multiple permissions (AND logic)
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requirePermission={['admin:access', 'admin:manage']}>
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
```

---

## Phase 1 Complete ✅

### What's Implemented

**Packages:**
- ✅ `@recruitiq/auth` - 3 permission hooks + tenant RBAC service factory
- ✅ `@recruitiq/ui` - 5 RBAC components
- ✅ Full TypeScript support
- ✅ Comprehensive JSDoc documentation

**Portal:**
- ✅ `platformRbacService` - Platform RBAC API client (system roles, templates)
- ✅ Proper separation from tenant management

**Tenant Apps:**
- ✅ `createTenantRbacService()` - Factory for org-scoped RBAC
- ✅ Example implementation in Nexus

**Infrastructure:**
- ✅ Hybrid architecture established
- ✅ Clear portal vs tenant separation
- ✅ All exports configured
- ✅ Ready for app integration

---

## Phase 2: App Integration (Next Steps)

### Portal Admin UI

**Create platform role management interface:**

1. **System Role List Page** (`apps/portal/src/pages/roles/SystemRoles.tsx`)
   - Display platform admin roles
   - Create/Edit platform roles
   - System permission assignment
   - Audit log viewer

2. **Role Template Manager** (`apps/portal/src/pages/roles/RoleTemplates.tsx`)
   - Create role templates for tenants
   - Per-product templates
   - Permission presets
   - Template versioning

3. **Platform Permissions Viewer** (`apps/portal/src/pages/permissions/PlatformPermissions.tsx`)
   - View all platform permissions
   - Documentation for each permission
   - Permission categories

**CRITICAL: Portal does NOT manage tenant users or tenant role assignments!**

### Tenant App Integration (Nexus, PayLinQ, RecruitIQ, ScheduleHub)

**Each app needs:**

1. **Role Management Page** (`apps/{app}/src/pages/settings/Roles.tsx`)
   - List organization roles
   - Create/Edit/Delete custom roles
   - Assign permissions to roles
   - View role members

2. **User Role Assignment** (`apps/{app}/src/pages/settings/UserRoles.tsx`)
   - List organization users
   - Assign/revoke roles per user
   - View user permissions
   - Bulk role assignment

3. **Update AuthContext** to load permissions from backend
4. **Add route guards** using `ProtectedRoute`
5. **Wrap features** with `<PermissionGate>`
6. **Update navigation** to hide/show based on permissions

### Example: Nexus Integration

```tsx
// 1. Create RBAC Service (apps/nexus/src/services/rbac.service.ts)
import { createTenantRbacService } from '@recruitiq/auth';
export const nexusRbacService = createTenantRbacService('nexus');

// 2. Role Management Page (apps/nexus/src/pages/settings/Roles.tsx)
import { nexusRbacService } from '../../services/rbac.service';

function RoleManagementPage() {
  const [roles, setRoles] = useState([]);
  
  useEffect(() => {
    nexusRbacService.getRoles().then(data => setRoles(data.roles));
  }, []);

  const handleAssignRole = async (userId, roleId) => {
    await nexusRbacService.assignRoleToUser(userId, roleId);
    toast.success('Role assigned successfully');
  };

  return (
    <div>
      <h1>Manage Roles</h1>
      <RoleList roles={roles} onAssign={handleAssignRole} />
    </div>
  );
}

// 3. Route Protection
<Route 
  path="/employees" 
  element={
    <ProtectedRoute 
      requireProduct="nexus"
      requirePermission="employee:view"
    >
      <EmployeesPage />
    </ProtectedRoute>
  } 
/>

// 4. Feature Gating
import { PermissionGate } from '@recruitiq/ui';

function EmployeesList() {
  return (
    <div>
      <PermissionGate permission="employee:view">
        <EmployeeTable />
      </PermissionGate>

      <PermissionGate permission="employee:create">
        <CreateEmployeeButton />
      </PermissionGate>

      <PermissionGate permission="employee:terminate">
        <TerminateButton />
      </PermissionGate>
    </div>
  );
}

// 5. Navigation Menu
function NavigationMenu() {
  const { hasPermission } = usePermissions();

  return (
    <nav>
      {hasPermission('employee:view') && (
        <NavLink to="/employees">Employees</NavLink>
      )}
      {hasPermission('department:view') && (
        <NavLink to="/departments">Departments</NavLink>
      )}
      {hasPermission('attendance:view') && (
        <NavLink to="/attendance">Attendance</NavLink>
      )}
    </nav>
  );
}
```

---

## Permission Codes Reference

### PayLinQ Permissions

```typescript
// Payroll Runs
'payroll:run:view'
'payroll:run:create'
'payroll:run:edit'
'payroll:run:approve'
'payroll:run:finalize'
'payroll:run:delete'

// Components
'payroll:component:view'
'payroll:component:manage'

// Worker Types
'payroll:worker-type:view'
'payroll:worker-type:manage'

// Tax Rules
'payroll:tax:view'
'payroll:tax:manage'
```

### Nexus Permissions

```typescript
// Employees
'employee:view'
'employee:create'
'employee:edit'
'employee:terminate'
'employee:salary'

// Departments
'department:view'
'department:manage'

// Locations
'location:view'
'location:manage'

// Benefits
'benefits:view'
'benefits:manage'
'benefits:enroll'

// Attendance
'attendance:view'
'attendance:manage'
'attendance:approve'

// Performance
'performance:view'
'performance:manage'
'performance:review'
```

### RecruitIQ Permissions

```typescript
// Jobs
'job:view'
'job:create'
'job:edit'
'job:delete'
'job:publish'

// Candidates
'candidate:view'
'candidate:create'
'candidate:edit'
'candidate:delete'

// Applications
'application:view'
'application:review'
'application:approve'

// Interviews
'interview:view'
'interview:schedule'
'interview:conduct'
```

### ScheduleHub Permissions

```typescript
// Schedules
'schedule:view'
'schedule:create'
'schedule:edit'
'schedule:approve'

// Shifts
'shift:view'
'shift:assign'
'shift:swap'

// Stations
'station:view'
'station:manage'
```

### Platform Permissions

```typescript
// RBAC Management
'rbac:view'
'rbac:manage'

// User Management
'user:view'
'user:create'
'user:edit'
'user:delete'
'user:role:assign'
```

---

## Testing Strategy

### Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '@recruitiq/ui';
import { AuthProvider } from '@recruitiq/auth';

describe('PermissionGate', () => {
  it('should render children when user has permission', () => {
    const mockUser = {
      id: '123',
      permissions: ['payroll:run:approve'],
    };

    render(
      <AuthProvider>
        <PermissionGate permission="payroll:run:approve">
          <button>Approve</button>
        </PermissionGate>
      </AuthProvider>
    );

    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('should render fallback when user lacks permission', () => {
    const mockUser = {
      id: '123',
      permissions: [],
    };

    render(
      <AuthProvider>
        <PermissionGate 
          permission="payroll:run:approve"
          fallback={<div>Access Denied</div>}
        >
          <button>Approve</button>
        </PermissionGate>
      </AuthProvider>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
describe('Payroll Approval Flow', () => {
  it('should allow approval with correct permission', async () => {
    // Mock user with approval permission
    const user = {
      permissions: ['payroll:run:approve'],
    };

    // Navigate to payroll page
    render(<App />);
    
    // Verify approve button is visible
    expect(screen.getByText('Approve Payroll')).toBeInTheDocument();
    
    // Click approve
    fireEvent.click(screen.getByText('Approve Payroll'));
    
    // Verify API call made
    expect(mockApprovePayroll).toHaveBeenCalled();
  });

  it('should deny approval without permission', async () => {
    const user = {
      permissions: ['payroll:run:view'], // No approve permission
    };

    render(<App />);
    
    // Verify approve button is NOT visible
    expect(screen.queryByText('Approve Payroll')).not.toBeInTheDocument();
  });
});
```

---

## Best Practices

### 1. Prefer Declarative Components

```tsx
// ✅ GOOD: Declarative
<PermissionGate permission="payroll:run:approve">
  <ApproveButton />
</PermissionGate>

// ❌ AVOID: Imperative
const canApprove = useHasPermission('payroll:run:approve');
return canApprove ? <ApproveButton /> : null;
```

### 2. Use Fallbacks for Better UX

```tsx
// ✅ GOOD: Show upgrade prompt
<PermissionGate 
  permission="advanced:feature"
  fallback={<UpgradePrompt feature="Advanced Analytics" />}
>
  <AdvancedAnalytics />
</PermissionGate>

// ❌ AVOID: Silent failure
<PermissionGate permission="advanced:feature">
  <AdvancedAnalytics />
</PermissionGate>
```

### 3. Group Related Permissions

```tsx
// ✅ GOOD: Check multiple related permissions
<PermissionGate requireAny={[
  'job:create',
  'job:edit',
  'job:delete'
]}>
  <JobManagementPanel />
</PermissionGate>

// ❌ AVOID: Duplicate checks
<HasPermission permission="job:create">
  <CreateButton />
</HasPermission>
<HasPermission permission="job:edit">
  <EditButton />
</HasPermission>
```

### 4. Protect Routes AND Features

```tsx
// ✅ GOOD: Double protection
<Route 
  path="/admin"
  element={
    <ProtectedRoute requirePermission="admin:access">
      <AdminPage />
    </ProtectedRoute>
  }
/>

// Inside AdminPage:
<PermissionGate permission="admin:manage">
  <ManagementPanel />
</PermissionGate>
```

---

## Troubleshooting

### Permissions Not Loading

```typescript
// Check AuthContext has permissions
const { permissions, isLoading } = useAuth();
console.log('Permissions:', permissions);
console.log('Loading:', isLoading);

// Verify backend returns permissions
// GET /api/auth/me should include:
{
  "user": {
    "id": "...",
    "permissions": ["payroll:run:view", "payroll:run:approve"]
  }
}
```

### Component Not Showing

```typescript
// Debug permission checks
const { hasPermission } = usePermissions();
console.log('Has permission?', hasPermission('payroll:run:approve'));
console.log('All permissions:', permissions);
```

### TypeScript Errors

```typescript
// Ensure @recruitiq/auth is built
cd packages/auth
pnpm build

// Ensure @recruitiq/ui is built
cd packages/ui
pnpm build
```

---

## Next Steps

**Phase 2: Portal Admin UI**
1. Create role management pages
2. Permission picker component
3. User role assignment interface
4. Audit log viewer

**Phase 3: Product Integration**
1. Update Nexus with permission guards
2. Update PayLinQ with permission guards
3. Update RecruitIQ with permission guards
4. Update ScheduleHub with permission guards

**Phase 4: Testing**
1. Unit tests for hooks
2. Component tests for gates
3. Integration tests per app
4. E2E tests for critical flows

---

## Summary

✅ **Phase 1 Complete** - Shared foundation implemented with proper separation
- 3 hooks in `@recruitiq/auth`
- 5 components in `@recruitiq/ui`
- Tenant RBAC service factory (`createTenantRbacService`)
- Platform RBAC service (Portal only)
- **Clear separation: Portal = Platform, Apps = Tenants**
- Full TypeScript support

📋 **Next Phase** - Portal admin UI for platform roles + tenant app RBAC UIs

🎯 **Goal** - Fine-grained permission control with proper multi-tenant isolation

---

## Key Architectural Decisions

1. **Portal manages PLATFORM, not tenants**
   - Portal users ≠ Tenant users
   - System roles ≠ Organization roles
   - Role templates provided to tenants

2. **Each tenant app manages its own RBAC**
   - Organization-scoped user management
   - Custom role creation per org
   - Independent role assignments

3. **Shared foundation for consistency**
   - Same hooks/components across all apps
   - Consistent permission checking
   - Unified UX patterns
