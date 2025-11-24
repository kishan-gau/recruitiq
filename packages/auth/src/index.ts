/**
 * @recruitiq/auth
 * 
 * Shared authentication and authorization module for RecruitIQ platform
 * Provides React context, hooks, and components for SSO across all apps
 */

export { AuthProvider, useAuth } from './AuthContext';
export type { User, AuthContextValue, MFAResponse, AuthProviderProps } from './AuthContext';

export { ProtectedRoute } from './ProtectedRoute';
export type { ProtectedRouteProps } from './ProtectedRoute';

// RBAC Hooks
export { usePermissions } from './hooks/usePermissions';
export type { UsePermissionsReturn } from './hooks/usePermissions';

export { useHasPermission } from './hooks/useHasPermission';
export { useCheckPermissions } from './hooks/useCheckPermissions';
export type { PermissionCheckResult } from './hooks/useCheckPermissions';

// RBAC Services
export { createTenantRbacService } from './services/tenantRbacService';
export type { TenantRbacService } from './services/tenantRbacService';

// Organization RBAC Service (Centralized multi-product RBAC management)
export { OrganizationRbacService, organizationRbacService } from './services/organizationRbacService';
export type { Permission, Role, User, PermissionsGrouped, RolesGrouped } from './services/organizationRbacService';

