/**
 * HasAnyPermission Component
 * 
 * Renders children if user has ANY of the specified permissions
 * 
 * @module @recruitiq/ui
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@recruitiq/auth';

export interface HasAnyPermissionProps {
  /** Array of permissions (user needs ANY one of them) */
  permissions: string[];
  /** Content to render when user has at least one permission */
  children: ReactNode;
  /** Optional fallback content when no permissions match */
  fallback?: ReactNode;
}

/**
 * Render children if user has ANY of the specified permissions
 * 
 * @example
 * ```tsx
 * <HasAnyPermission permissions={['job:create', 'job:edit', 'job:delete']}>
 *   <JobManagementPanel />
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
