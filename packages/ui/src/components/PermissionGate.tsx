/**
 * PermissionGate Component
 * 
 * Conditional rendering wrapper based on permissions
 * Shows children only if user has required permissions
 * 
 * @module @recruitiq/ui
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@recruitiq/auth';

export interface PermissionGateProps {
  /** Permission(s) required to render children */
  permission?: string | string[];
  /** Require ANY of the permissions (OR logic) */
  requireAny?: string[];
  /** Require ALL of the permissions (AND logic) */
  requireAll?: string[];
  /** Content to render when user has permission */
  children: ReactNode;
  /** Optional fallback content when permission denied */
  fallback?: ReactNode;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
}

/**
 * Permission Gate Component
 * 
 * Conditionally renders children based on user permissions
 * Supports single permission, any-of, or all-of logic
 * 
 * @example
 * ```tsx
 * // Single permission
 * <PermissionGate permission="payroll:run:approve">
 *   <ApproveButton />
 * </PermissionGate>
 * 
 * // Any of multiple permissions
 * <PermissionGate requireAny={['job:create', 'job:edit']}>
 *   <JobForm />
 * </PermissionGate>
 * 
 * // All of multiple permissions
 * <PermissionGate requireAll={['payroll:run:edit', 'payroll:run:approve']}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * // With fallback content
 * <PermissionGate permission="admin:access" fallback={<AccessDenied />}>
 *   <AdminDashboard />
 * </PermissionGate>
 * ```
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  requireAny,
  requireAll,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = <div>Loading...</div>,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // Show loading state if enabled
  if (showLoading && isLoading) {
    return <>{loadingComponent}</>;
  }

  // Check permissions based on props
  let hasAccess = false;

  if (permission) {
    // Single permission or array of permissions (treated as requireAll)
    if (Array.isArray(permission)) {
      hasAccess = hasAllPermissions(...permission);
    } else {
      hasAccess = hasPermission(permission);
    }
  } else if (requireAny) {
    // Any of the specified permissions (OR logic)
    hasAccess = hasAnyPermission(...requireAny);
  } else if (requireAll) {
    // All of the specified permissions (AND logic)
    hasAccess = hasAllPermissions(...requireAll);
  } else {
    console.warn('PermissionGate: No permissions specified');
    return <>{fallback}</>;
  }

  // Render children if user has access, otherwise show fallback
  return <>{hasAccess ? children : fallback}</>;
};
