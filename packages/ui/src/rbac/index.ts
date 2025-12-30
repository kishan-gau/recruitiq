/**
 * @recruitiq/ui RBAC (Role-Based Access Control) Components
 * 
 * Permission and access control components used across all features.
 * These components provide declarative ways to conditionally render content
 * based on user permissions and roles.
 * 
 * @module @recruitiq/ui/rbac
 * @public
 */

// Core permission checking components
export { HasPermission } from './HasPermission';
export type { HasPermissionProps } from './HasPermission';

// Check for multiple permissions
export { HasAnyPermission } from './HasAnyPermission';
export type { HasAnyPermissionProps } from './HasAnyPermission';

export { HasAllPermissions } from './HasAllPermissions';
export type { HasAllPermissionsProps } from './HasAllPermissions';

// Access denied UI
export { AccessDenied } from './AccessDenied';
export type { AccessDeniedProps } from './AccessDenied';

// Feature gate (permission-based feature flags)
export { FeatureGate } from './FeatureGate';
export type { FeatureGateProps } from './FeatureGate';

// ============================================
// LEGACY ALIASES - Deprecated
// ============================================
// PermissionGate is an alias for HasPermission
// Use HasPermission directly in new code
export { HasPermission as PermissionGate };
export type { HasPermissionProps as PermissionGateProps };

