/**
 * HasAllPermissions Component
 * 
 * Permission check with AND logic
 * Renders if user has ALL of the specified permissions
 * 
 * @module @recruitiq/ui/rbac
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@recruitiq/auth';

export interface HasAllPermissionsProps {
  /** Permissions to check (user needs ALL of these) */
  permissions: string[];
  /** Content to render when user has all permissions */
  children: ReactNode;
  /** Optional fallback content when not all permissions are present */
  fallback?: ReactNode;
}

/**
 * Permission check with AND logic
 * Renders children if user has ALL of the specified permissions
 * 
 * @example
 * ```tsx
 * <HasAllPermissions permissions={['payroll:run:edit', 'payroll:run:approve']}>
 *   <ApprovePayrollButton />
 * </HasAllPermissions>
 * ```
 */
export const HasAllPermissions: React.FC<HasAllPermissionsProps> = ({
  permissions,
  children,
  fallback = null,
}) => {
  const { hasAllPermissions } = usePermissions();

  return <>{hasAllPermissions(...permissions) ? children : fallback}</>;
};
