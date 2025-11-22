# Frontend RBAC Implementation Guide

**Status:** Phase 1 Complete - Shared Foundation  
**Branch:** `feature/frontend-rbac-integration`  
**Last Updated:** November 22, 2025

---

## Overview

Frontend RBAC integration follows a **hybrid architecture**:
- **80% Shared Foundation** - Core components and hooks in `packages/`
- **20% App-Specific** - Custom UI per product in `apps/`

This provides consistency across all apps while allowing product-specific customization.

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
- ✅ `@recruitiq/auth` - 3 permission hooks
- ✅ `@recruitiq/ui` - 5 RBAC components
- ✅ Full TypeScript support
- ✅ Comprehensive JSDoc documentation

**Portal:**
- ✅ `rbacService` - Complete RBAC API client
  - Permission queries (all, grouped, by product)
  - Role management (CRUD)
  - User role assignments (assign, revoke)
  - Permission queries per user

**Infrastructure:**
- ✅ Hybrid architecture established
- ✅ All exports configured
- ✅ Ready for app integration

---

## Phase 2: App Integration (Next Steps)

### Portal Admin UI

**Create role management interface:**

1. **Role List Page** (`apps/portal/src/pages/roles/RolesList.tsx`)
   - Display all roles with filters (product, system/custom)
   - Create/Edit/Delete actions
   - Permission assignment interface
   - Audit log viewer

2. **Role Form** (`apps/portal/src/pages/roles/RoleForm.tsx`)
   - Create/Edit role
   - Select permissions from grouped list
   - Product assignment
   - Validation

3. **User Role Manager** (`apps/portal/src/pages/users/UserRoleManager.tsx`)
   - Assign/revoke roles per user
   - Per-product role assignment
   - Visual permission summary

### Product Apps Integration

**Each app needs:**

1. **Update AuthContext** to load permissions from backend
2. **Add route guards** using `ProtectedRoute`
3. **Wrap features** with `<PermissionGate>`
4. **Update navigation** to hide/show based on permissions
5. **Custom AccessDenied** pages (optional)

### Example: Nexus Integration

```tsx
// 1. Route Protection
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

// 2. Feature Gating
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

// 3. Navigation Menu
function NavigationMenu() {
  const { hasPermission } = usePermissions();

  return (
    <nav>
      {hasPermission('employee:view') && (
        <NavLink to="/employees">Employees</NavLink>
      )}
      {hasPermission('payroll:view') && (
        <NavLink to="/payroll">Payroll</NavLink>
      )}
      {hasPermission('reports:view') && (
        <NavLink to="/reports">Reports</NavLink>
      )}
    </nav>
  );
}

// 4. Custom Access Denied (optional)
// apps/nexus/src/pages/AccessDenied.tsx
import { AccessDenied as BaseAccessDenied } from '@recruitiq/ui';

export function NexusAccessDenied({ missingPermissions }) {
  return (
    <BaseAccessDenied
      title="Nexus Access Required"
      message="You need additional permissions to access this Nexus feature."
      missingPermissions={missingPermissions}
      showContactAdmin
    />
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

✅ **Phase 1 Complete** - Shared foundation implemented
- 3 hooks in `@recruitiq/auth`
- 5 components in `@recruitiq/ui`
- RBAC service for Portal
- Full TypeScript support

📋 **Next Phase** - Portal admin UI + app integration

🎯 **Goal** - Fine-grained permission control across all RecruitIQ products with consistent UX
