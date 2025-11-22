/**
 * usePermissions Hook
 * 
 * Hook to access user's permissions from auth context
 * Used for permission checking throughout the app
 * 
 * @module @recruitiq/auth
 */

import { useAuth } from '../AuthContext';

export interface UsePermissionsReturn {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  isLoading: boolean;
}

/**
 * Hook to access and check user permissions
 * 
 * @returns Permission checking utilities
 * 
 * @example
 * ```tsx
 * const { hasPermission, hasAnyPermission } = usePermissions();
 * 
 * if (hasPermission('payroll:run:approve')) {
 *   // Show approve button
 * }
 * 
 * if (hasAnyPermission('job:create', 'job:edit')) {
 *   // Show job form
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const { permissions, isLoading } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the specified permissions (OR logic)
   */
  const hasAnyPermission = (...requiredPermissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return requiredPermissions.some(perm => permissions.includes(perm));
  };

  /**
   * Check if user has ALL of the specified permissions (AND logic)
   */
  const hasAllPermissions = (...requiredPermissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return requiredPermissions.every(perm => permissions.includes(perm));
  };

  return {
    permissions: permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
  };
}
