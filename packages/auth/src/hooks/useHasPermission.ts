/**
 * useHasPermission Hook
 * 
 * Simplified hook for checking a single permission
 * Convenience wrapper around usePermissions
 * 
 * @module @recruitiq/auth
 */

import { usePermissions } from './usePermissions';

/**
 * Hook to check if user has a specific permission
 * 
 * @param permission - Permission code to check (e.g., 'payroll:run:approve')
 * @returns Boolean indicating if user has the permission
 * 
 * @example
 * ```tsx
 * const canApprove = useHasPermission('payroll:run:approve');
 * 
 * return (
 *   <div>
 *     {canApprove && <Button onClick={handleApprove}>Approve</Button>}
 *   </div>
 * );
 * ```
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}
