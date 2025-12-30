/**
 * HasAnyPermission Component
 * 
 * Permission check with OR logic
 * Renders if user has ANY of the specified permissions
 * 
 * @module @recruitiq/ui/rbac
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@recruitiq/auth';

export interface HasAnyPermissionProps {
  /** Permissions to check (user needs ANY of these) */
  permissions: string[];
  /** Content to render when user has any permission */
  children: ReactNode;
  /** Optional fallback content when no permissions match */
  fallback?: ReactNode;
}

/**
 * Permission check with OR logic
 * Renders children if user has ANY of the specified permissions
 * 
 * @example
 * ```tsx
 * <HasAnyPermission permissions={['job:create', 'job:edit']}>
 *   <JobForm />
 * </HasAnyPermission>
 * ```
 */
export const HasAnyPermission: React.FC<HasAnyPermissionProps> = ({
  permissions,
  children,
  fallback = null,
}) => {
  const { hasAnyPermission } = usePermissions();

  return <>{hasAnyPermission(...permissions) ? children : fallback}</>;
};
