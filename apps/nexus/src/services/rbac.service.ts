/**
 * Nexus RBAC Service
 * 
 * Tenant-level RBAC management for Nexus HRIS
 * Manages roles and permissions for users within the organization
 * 
 * @module nexus-rbac
 */

import { createTenantRbacService } from '@recruitiq/auth';

/**
 * Nexus RBAC Service Instance
 * 
 * Manages RBAC for Nexus product within the current organization
 * All operations are automatically scoped to organizationId by backend
 */
export const nexusRbacService = createTenantRbacService('nexus');

/**
 * Example Usage:
 * 
 * ```typescript
 * // Get all roles in organization
 * const roles = await nexusRbacService.getRoles();
 * 
 * // Get permissions for this product
 * const permissions = await nexusRbacService.getGroupedPermissions();
 * 
 * // Assign role to user
 * await nexusRbacService.assignRoleToUser(userId, roleId);
 * 
 * // Create custom role
 * await nexusRbacService.createRole({
 *   name: 'hr_manager',
 *   display_name: 'HR Manager',
 *   description: 'Can manage employees and departments',
 *   permissionIds: ['employee:view', 'employee:edit', 'department:manage']
 * });
 * ```
 */
