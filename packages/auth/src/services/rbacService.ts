/**
 * Shared RBAC Service
 * 
 * Used by ALL tenant applications (Nexus, PayLinQ, ScheduleHub, RecruitIQ)
 * to manage RBAC within their own settings/admin sections.
 * 
 * ARCHITECTURE:
 * ============
 * 
 * This service provides shared RBAC functionality that each tenant app uses
 * in its own Settings/Admin section to manage:
 * - Roles for that specific product
 * - Permissions for that specific product
 * - User role assignments within that organization
 * 
 * Example: In Nexus Settings page
 * - Nexus Admin can create "HR Manager" role
 * - Assign permissions: "employee:view", "department:edit", "salary:manage"
 * - Assign users to the "HR Manager" role
 * 
 * CENTRALIZED ARCHITECTURE:
 * ========================
 * 
 * All RBAC data is stored in the central 'rbac' schema:
 * - rbac.roles (product-scoped roles)
 * - rbac.permissions (product-scoped permissions)
 * - rbac.user_roles (user role assignments)
 * 
 * Each product has its own:
 * - Product-specific permissions (seeded during migration)
 * - Product-specific system roles (seeded during migration)
 * - Organization-specific custom roles (created by org admins)
 * 
 * PORTAL DOES NOT MANAGE TENANT RBAC:
 * ===================================
 * Portal only manages platform admin access (who can access the portal itself).
 * Portal does NOT:
 * - Create tenant roles
 * - Manage tenant permissions
 * - Assign tenant users to roles
 * 
 * Each tenant app manages its own RBAC in its Settings section.
 */

import { APIClient } from '@recruitiq/api-client';

/**
 * Shared RBAC Service for Tenant Applications
 * 
 * This service is used by:
 * - Nexus Settings page
 * - PayLinQ Settings page
 * - ScheduleHub Settings page
 * - RecruitIQ Settings page
 * 
 * Each app uses this service to manage RBAC for its own product.
 */
export class RBACService {
  private apiClient: APIClient;
  private productSlug: string;

  /**
   * @param productSlug - Product identifier (nexus, paylinq, schedulehub, recruitiq)
   */
  constructor(productSlug: string) {
    this.apiClient = new APIClient();
    this.productSlug = productSlug;
  }

  /**
   * Get all permissions for this product
   * Returns product-specific permissions (e.g., Nexus permissions, PayLinQ permissions)
   */
  async getPermissions() {
    const response = await this.apiClient.get(
      `/api/products/${this.productSlug}/rbac/permissions`
    );
    return response.data;
  }

  /**
   * Get all roles for this product in current organization
   * Returns both system roles and organization-created custom roles
   */
  async getRoles() {
    const response = await this.apiClient.get(
      `/api/products/${this.productSlug}/rbac/roles`
    );
    return response.data;
  }

  /**
   * Get a single role by ID
   */
  async getRole(roleId: string) {
    const response = await this.apiClient.get(
      `/api/products/${this.productSlug}/rbac/roles/${roleId}`
    );
    return response.data;
  }

  /**
   * Create a custom role for this product
   * Only organization admins can do this
   * 
   * @param data.name - Role name (e.g., "payroll_manager", "hr_specialist")
   * @param data.display_name - Display name (e.g., "Payroll Manager")
   * @param data.description - Role description
   * @param data.permissionIds - Array of permission IDs to assign
   */
  async createRole(data: {
    name: string;
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    const response = await this.apiClient.post(
      `/api/products/${this.productSlug}/rbac/roles`,
      data
    );
    return response.data;
  }

  /**
   * Update a custom role
   * Cannot update system roles (is_system_role = true)
   */
  async updateRole(
    roleId: string,
    data: {
      display_name?: string;
      description?: string;
      permissionIds?: string[];
    }
  ) {
    const response = await this.apiClient.patch(
      `/api/products/${this.productSlug}/rbac/roles/${roleId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a custom role
   * Cannot delete system roles
   */
  async deleteRole(roleId: string) {
    const response = await this.apiClient.delete(
      `/api/products/${this.productSlug}/rbac/roles/${roleId}`
    );
    return response.data;
  }

  /**
   * Get all users in current organization with their role assignments
   * Used in Settings > Users page to show who has which roles
   */
  async getUsers() {
    const response = await this.apiClient.get(
      `/api/products/${this.productSlug}/rbac/users`
    );
    return response.data;
  }

  /**
   * Get roles assigned to a specific user
   */
  async getUserRoles(userId: string) {
    const response = await this.apiClient.get(
      `/api/products/${this.productSlug}/rbac/users/${userId}/roles`
    );
    return response.data;
  }

  /**
   * Assign a role to a user in current organization
   * Used in Settings > Users page when assigning roles
   */
  async assignRole(userId: string, roleId: string) {
    const response = await this.apiClient.post(
      `/api/products/${this.productSlug}/rbac/users/${userId}/roles`,
      { roleId }
    );
    return response.data;
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(userId: string, roleId: string) {
    const response = await this.apiClient.delete(
      `/api/products/${this.productSlug}/rbac/users/${userId}/roles/${roleId}`
    );
    return response.data;
  }

  /**
   * Check if current user has specific permissions
   * Used for UI rendering (show/hide buttons, menu items, etc.)
   * 
   * @param permissions - Array of permission codes to check
   * @returns Object mapping permission codes to boolean values
   * 
   * Example:
   * const perms = await rbacService.checkPermissions(['employee:view', 'salary:edit']);
   * if (perms['salary:edit']) {
   *   // Show edit salary button
   * }
   */
  async checkPermissions(permissions: string[]) {
    const response = await this.apiClient.post(
      `/api/products/${this.productSlug}/rbac/check-permissions`,
      { permissions }
    );
    return response.data;
  }
}

/**
 * Usage in Tenant Apps:
 * =====================
 * 
 * // In Nexus Settings page (apps/nexus/src/pages/Settings/RolesTab.tsx)
 * import { RBACService } from '@recruitiq/auth';
 * 
 * const rbacService = new RBACService('nexus');
 * 
 * // Get all Nexus roles for current organization
 * const roles = await rbacService.getRoles();
 * 
 * // Create custom role in Nexus
 * await rbacService.createRole({
 *   name: 'department_manager',
 *   display_name: 'Department Manager',
 *   description: 'Can manage employees and departments',
 *   permissionIds: ['employee:view', 'employee:edit', 'department:manage']
 * });
 * 
 * // Assign role to user
 * await rbacService.assignRole(userId, roleId);
 * 
 * 
 * // In PayLinQ Settings page (apps/paylinq/src/pages/Settings/RolesTab.tsx)
 * import { RBACService } from '@recruitiq/auth';
 * 
 * const rbacService = new RBACService('paylinq');
 * 
 * // Get all PayLinQ roles for current organization
 * const roles = await rbacService.getRoles();
 * 
 * // Create custom role in PayLinQ
 * await rbacService.createRole({
 *   name: 'payroll_specialist',
 *   display_name: 'Payroll Specialist',
 *   description: 'Can process payroll but not change rates',
 *   permissionIds: ['payroll:view', 'payroll:process']
 * });
 */

export default RBACService;
