/**
 * HasPermission Component
 * 
 * Simple permission check component
 * Alternative to PermissionGate with simpler props
 * 
 * @module @recruitiq/ui
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@recruitiq/auth';

export interface HasPermissionProps {
  /** Permission required to render children */
  permission: string;
  /** Content to render when user has permission */
  children: ReactNode;
  /** Optional fallback content when permission denied */
  fallback?: ReactNode;
}

/**
 * Simple permission check component
 * 
 * @example
 * ```tsx
 * <HasPermission permission="payroll:run:approve">
 *   <ApproveButton />
 * </HasPermission>
 * ```
 */
export const HasPermission: React.FC<HasPermissionProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = usePermissions();

  return <>{hasPermission(permission) ? children : fallback}</>;
};
