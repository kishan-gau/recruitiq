/**
 * useCheckPermissions Hook
 * 
 * Hook for checking multiple permissions at once
 * Returns object with all check results
 * 
 * @module @recruitiq/auth
 */

import { usePermissions } from './usePermissions';

export interface PermissionCheckResult {
  [permissionCode: string]: boolean;
}

/**
 * Hook to check multiple permissions at once
 * 
 * @param permissions - Array of permission codes to check
 * @returns Object mapping permission codes to boolean results
 * 
 * @example
 * ```tsx
 * const checks = useCheckPermissions([
 *   'payroll:run:view',
 *   'payroll:run:create',
 *   'payroll:run:approve',
 * ]);
 * 
 * return (
 *   <div>
 *     {checks['payroll:run:view'] && <PayrollList />}
 *     {checks['payroll:run:create'] && <CreateButton />}
 *     {checks['payroll:run:approve'] && <ApproveButton />}
 *   </div>
 * );
 * ```
 */
export function useCheckPermissions(permissionsToCheck: string[]): PermissionCheckResult {
  const { hasPermission } = usePermissions();

  const result: PermissionCheckResult = {};
  
  for (const permission of permissionsToCheck) {
    result[permission] = hasPermission(permission);
  }

  return result;
}
