/**
 * HasAllPermissions Component
 * 
 * Renders children if user has ALL of the specified permissions
 * 
 * @module @recruitiq/ui
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@recruitiq/auth';

export interface HasAllPermissionsProps {
  /** Array of permissions (user needs ALL of them) */
  permissions: string[];
  /** Content to render when user has all permissions */
  children: ReactNode;
  /** Optional fallback content when missing permissions */
  fallback?: ReactNode;
}

/**
 * Render children if user has ALL of the specified permissions
 * 
 * @example
 * ```tsx
 * <HasAllPermissions permissions={['payroll:run:edit', 'payroll:run:approve']}>
 *   <FullAccessPanel />
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
