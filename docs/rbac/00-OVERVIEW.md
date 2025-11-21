# Centralized RBAC System - Implementation Plan

**Version:** 1.0  
**Date:** November 21, 2025  
**Status:** Planning Phase

---

## Executive Summary

This document outlines the implementation of a **Centralized Identity and Access Management (IAM) system** with **Product-Agnostic RBAC** for the RecruitIQ platform. The system will provide unified user and role management across PayLinQ, Nexus, and RecruitIQ products.

### Vision

Create a single, unified interface for managing:
- **User Accounts** - Create users from employee records
- **Roles** - Define roles with specific permissions
- **Permissions** - Granular access control for features
- **Assignments** - Assign roles to users per product
- **License Enforcement** - Respect tenant product subscriptions

### Industry Alignment

This architecture follows patterns used by:
- **AWS IAM** - Unified access management across services
- **Google Cloud IAM** - Centralized identity for all GCP products
- **Azure Active Directory** - Single identity platform for Azure
- **Salesforce** - Unified permission system across clouds
- **Atlassian** - Single user management for all products

---

## Current State Analysis

### Existing Authentication System

**Backend (`backend/src/middleware/auth.js`):**
- ✅ Dual authentication: `authenticatePlatform` + `authenticateTenant`
- ✅ Product access checking: `requireProductAccess(product)`
- ✅ Product role checking: `requireProductRole(product, ...roles)`
- ✅ Permission checking: `requirePermission(...permissions)` (limited usage)
- ✅ Platform roles: `requirePlatformRole(...roles)`

**Current Middleware Stack:**
```javascript
// Platform users (Portal)
authenticatePlatform → requirePlatformRole → requirePlatformPermission

// Tenant users (PayLinQ, Nexus, RecruitIQ)
authenticateTenant → requireProductAccess → requireProductRole
```

**User Data Structure:**
```typescript
// Tenant User (from hris.user_account)
{
  id: string;
  email: string;
  organizationId: string;
  enabledProducts: string[];        // ['paylinq', 'nexus', 'recruitiq']
  productRoles: {                   // Product-specific roles
    paylinq?: string;
    nexus?: string;
    recruitiq?: string;
  };
  employeeId?: string;              // Link to employees table
  type: 'tenant';
}

// Platform User (from platform.users)
{
  id: string;
  email: string;
  role: string;                     // 'super_admin', 'admin', 'support'
  permissions: string[];            // ['users:manage', 'orgs:view']
  type: 'platform';
}
```

### Current Product Implementation

#### PayLinQ - Best RBAC Implementation
```javascript
// backend/src/products/paylinq/routes/routes.js
router.use(authenticateTenant);
router.use(requireProductAccess('paylinq'));

// backend/src/products/paylinq/routes/currency.js
router.post('/', requirePermission('payroll:manage'), createCurrency);
router.delete('/:id', requirePermission('admin'), deleteCurrency);
```

#### Nexus - Good Product Access Control
```javascript
// backend/src/products/nexus/routes/index.js
router.use(authenticateTenant);
router.use(requireProductAccess('nexus'));
// Missing: Granular permission checks on routes
```

#### RecruitIQ - Minimal RBAC
```javascript
// backend/src/routes/users.js
router.post('/', requireRole('owner', 'admin'), createUser);
// Most routes lack role/permission enforcement
```

### Frontend State

**Shared Auth Package (`packages/auth/src/AuthContext.tsx`):**
```typescript
interface User {
  role: string;
  permissions: string[];
  productRoles?: Record<string, string>;
}

interface AuthContextValue {
  user: User | null;
  permissions: string[];  // ✅ Available but unused
  isAuthenticated: boolean;
}
```

**Frontend Usage:**
- ✅ Authentication checks work
- ✅ User object contains role/permission data
- ❌ NO role-based UI rendering
- ❌ NO permission checks before actions
- ❌ NO helper hooks for permission checking

---

## Gap Analysis

### What's Missing

1. **Centralized Role Management**
   - ❌ No UI to create/edit roles
   - ❌ No role-permission assignments
   - ❌ Roles hardcoded per product

2. **Permission Management**
   - ❌ Permissions defined in code, not database
   - ❌ No way to customize permissions per organization
   - ❌ No permission categories or grouping

3. **User-Role Assignment**
   - ❌ No UI to assign roles to users
   - ❌ Product roles stored in `product_roles` JSONB field
   - ❌ No audit trail for role changes

4. **Employee-to-User Conversion**
   - ❌ No workflow to create user from employee
   - ❌ Manual process outside the system

5. **Frontend Permission Enforcement**
   - ❌ No `usePermissions()` hook
   - ❌ No `<CanAccess>` component
   - ❌ No role-based UI rendering

6. **Cross-Product Access**
   - ❌ Each product manages roles independently
   - ❌ No unified RBAC interface
   - ❌ No product-agnostic role definitions

---

## Proposed Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│              CENTRALIZED RBAC MODULE                         │
│                                                              │
│  Database Tables:                                            │
│  • roles (organization-scoped, product-scoped)              │
│  • permissions (system-defined, product-categorized)        │
│  • role_permissions (many-to-many)                          │
│  • user_roles (user-role assignments with product context)  │
│                                                              │
│  Backend API: /api/rbac/*                                   │
│  • Role CRUD                                                │
│  • Permission management                                    │
│  • User-role assignment                                     │
│  • Permission checking                                      │
│  • Employee → User conversion                               │
│                                                              │
│  Shared Frontend: @recruitiq/rbac-ui                        │
│  • RoleManager component                                    │
│  • PermissionMatrix component                               │
│  • UserRoleAssigner component                               │
│  • usePermissions() hook                                    │
│  • <CanAccess> component                                    │
└─────────────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ PayLinQ  │  │  Nexus   │  │RecruitIQ │
    │          │  │          │  │          │
    │ Settings │  │ Settings │  │ Settings │
    │ /rbac    │  │ /rbac    │  │ /rbac    │
    └──────────┘  └──────────┘  └──────────┘
```

### Technology Stack

**Backend:**
- Node.js + Express (existing)
- PostgreSQL (existing)
- JWT authentication (existing)
- Joi validation (existing)

**Frontend:**
- React + TypeScript (existing)
- TanStack Query (React Query) - existing
- Shared package: `@recruitiq/rbac-ui`
- Tailwind CSS (existing)

**Database:**
- New tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- Existing: `hris.user_account`, `organizations`, `employees`

---

## Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1)
- Database schema design
- Migration scripts
- RBAC models (Sequelize/raw SQL)
- Core services (RoleService, PermissionService, UserRoleService)
- Seed system permissions

### Phase 2: Backend API & Middleware (Week 2)
- REST API endpoints (`/api/rbac/*`)
- Updated permission checking middleware
- Integration with existing auth system
- API documentation

### Phase 3: Shared Frontend Package (Week 3)
- Create `@recruitiq/rbac-ui` package
- Core components (RoleManager, PermissionMatrix, UserRoleAssigner)
- React Query hooks
- Permission checking utilities

### Phase 4: Product Integration (Week 4)
- Integrate RBAC UI into PayLinQ
- Integrate RBAC UI into Nexus
- Integrate RBAC UI into RecruitIQ
- Update navigation/settings menus

### Phase 5: Employee-to-User Workflow (Week 5)
- UI in employee details page
- User creation flow
- Email notifications
- Default role assignments

### Phase 6: Migration & Rollout (Week 6)
- Migrate existing roles to new system
- Update existing permission checks
- Testing & validation
- Documentation & training

---

## Success Criteria

### Functional Requirements
- ✅ Admins can create/edit/delete custom roles
- ✅ Admins can assign permissions to roles
- ✅ Admins can assign roles to users (per product)
- ✅ Users can create accounts from employee records
- ✅ System respects license restrictions (only enabled products)
- ✅ RBAC interface accessible from all three products
- ✅ Permission checks work consistently across products

### Non-Functional Requirements
- ✅ < 200ms API response time for permission checks
- ✅ Backward compatible with existing auth system
- ✅ Zero downtime migration
- ✅ Audit trail for all role/permission changes
- ✅ 100% test coverage for RBAC services

### User Experience
- ✅ Intuitive role management interface
- ✅ Visual permission matrix
- ✅ Inline help and documentation
- ✅ Bulk user-role assignments
- ✅ Search and filter capabilities

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing auth | Medium | High | Maintain backward compatibility, phased rollout |
| Performance degradation | Low | Medium | Cache permissions, optimize queries |
| Migration data loss | Low | High | Backup before migration, rollback plan |
| Frontend state complexity | Medium | Medium | Use proven state management (React Query) |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User confusion | Medium | Medium | Clear documentation, gradual rollout |
| Extended development time | Medium | Medium | Phased approach, MVP first |
| Incomplete testing | Low | High | Comprehensive test suite, QA phase |

---

## Documentation Structure

This implementation plan is divided into the following documents:

1. **00-OVERVIEW.md** (this document) - Executive summary and architecture
2. **01-DATABASE-DESIGN.md** - Database schema, migrations, indexing
3. **02-BACKEND-IMPLEMENTATION.md** - Models, services, controllers, routes
4. **03-MIDDLEWARE-INTEGRATION.md** - Permission checking, enforcement
5. **04-FRONTEND-PACKAGE.md** - Shared RBAC UI package design
6. **05-PRODUCT-INTEGRATION.md** - Integration into PayLinQ, Nexus, RecruitIQ
7. **06-EMPLOYEE-USER-WORKFLOW.md** - Employee to user conversion
8. **07-MIGRATION-STRATEGY.md** - Migration plan, rollback procedures
9. **08-TESTING-STRATEGY.md** - Unit, integration, E2E testing
10. **09-API-DOCUMENTATION.md** - API endpoints, request/response formats

---

## Quick Start

For developers starting with RBAC implementation:

1. Read **01-DATABASE-DESIGN.md** for schema understanding
2. Read **02-BACKEND-IMPLEMENTATION.md** for API development
3. Read **04-FRONTEND-PACKAGE.md** for UI component development
4. Refer to **09-API-DOCUMENTATION.md** for endpoint reference

---

## Approval & Sign-Off

| Stakeholder | Role | Status | Date |
|-------------|------|--------|------|
| Tech Lead | Architect | ⏳ Pending | - |
| Backend Team | Implementation | ⏳ Pending | - |
| Frontend Team | Implementation | ⏳ Pending | - |
| QA Team | Testing | ⏳ Pending | - |
| Product Owner | Business Approval | ⏳ Pending | - |

---

**Next:** [01-DATABASE-DESIGN.md](./01-DATABASE-DESIGN.md)
