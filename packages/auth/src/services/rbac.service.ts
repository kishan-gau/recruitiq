/**
 * Shared RBAC Service
 * 
 * Service for tenant-level RBAC management in tenant applications
 * 
 * ARCHITECTURE:
 * - Shared package (@recruitiq/auth) for reuse across all tenant apps
 * - Each tenant app has a Settings/Admin page with RBAC section
 * - Manages tenant users, roles, and permissions within that tenant
 * 
 * DATABASE:
 * - Centralized RBAC schema in platform database
 * - Tables: rbac.roles, rbac.permissions, rbac.role_permissions, rbac.user_roles
 * - All tables include organization_id for tenant isolation
 * 
 * USAGE IN TENANT APPS:
 * ```typescript
 * import { rbacService } from '@recruitiq/auth';
 * 
 * // In Settings page
 * const roles = await rbacService.getRoles();
 * const permissions = await rbacService.getPermissions();
 * const users = await rbacService.getUsers();
 * ```
 * 
 * SYSTEM ROLES:
 * - Seeded during database migration (e.g., "HR Manager", "Employee Viewer")
 * - Can be edited by tenant admins through Settings UI
 * - Custom roles can be created by tenant admins
 * 
 * EXAMPLE FLOW:
 * 1. Tenant admin goes to Nexus → Settings → Users & Roles
 * 2. Sees list of users in their organization
 * 3. Can assign roles to users
 * 4. Can create/edit custom roles
 * 5. Can manage role permissions
 */

import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

/**
 * Tenant RBAC Service (Shared across all tenant apps)
 * 
 * Manages RBAC within a tenant organization:
 * - Tenant users (employees using the product)
 * - Tenant roles (what users can do in the product)
 * - Product permissions (actions available in the product)
 */
export const rbacService = {
  // ============================================================================
  // Permissions
  // ============================================================================

  /**
   * Get all permissions for current tenant
   * These are the actions that can be assigned to roles
   * 
   * Example permissions in Nexus:
   * - employees:view - View employee list
   * - employees:create - Create new employees
   * - departments:manage - Full department management
   * - attendance:approve - Approve time-off requests
   */
  async getPermissions() {
    try {
      const response = await apiClient.get('/api/rbac/permissions');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch permissions:', error);
      throw error;
    }
  },

  // ============================================================================
  // Roles
  // ============================================================================

  /**
   * Get all roles for current tenant
   * Includes both system roles (seeded) and custom roles
   * 
   * Example roles in Nexus:
   * - HR Manager (system role) - Full HR access
   * - Employee Viewer (system role) - Read-only access
   * - Custom Role 1 (custom) - Created by tenant admin
   */
  async getRoles() {
    try {
      const response = await apiClient.get('/api/rbac/roles');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch roles:', error);
      throw error;
    }
  },

  /**
   * Get single role with permissions
   */
  async getRole(roleId: string) {
    try {
      const response = await apiClient.get(`/api/rbac/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch role:', error);
      throw error;
    }
  },

  /**
   * Create custom role
   * Tenant admins can create roles with selected permissions
   */
  async createRole(data: {
    name: string;
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    try {
      const response = await apiClient.post('/api/rbac/roles', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create role:', error);
      throw error;
    }
  },

  /**
   * Update role (system or custom)
   * Tenant admins can modify role permissions and details
   */
  async updateRole(roleId: string, data: {
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    try {
      const response = await apiClient.patch(`/api/rbac/roles/${roleId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update role:', error);
      throw error;
    }
  },

  /**
   * Delete custom role
   * Only custom roles can be deleted (system roles are protected)
   */
  async deleteRole(roleId: string) {
    try {
      const response = await apiClient.delete(`/api/rbac/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to delete role:', error);
      throw error;
    }
  },

  // ============================================================================
  // Users
  // ============================================================================

  /**
   * Get all users in current tenant
   * Returns users with their assigned roles
   */
  async getUsers() {
    try {
      const response = await apiClient.get('/api/rbac/users');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  /**
   * Get roles assigned to a specific user
   */
  async getUserRoles(userId: string) {
    try {
      const response = await apiClient.get(`/api/rbac/users/${userId}/roles`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user roles:', error);
      throw error;
    }
  },

  /**
   * Assign role to user
   * Tenant admins can assign roles to users in their organization
   */
  async assignRole(userId: string, roleId: string) {
    try {
      const response = await apiClient.post(`/api/rbac/users/${userId}/roles`, {
        roleId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  },

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string) {
    try {
      const response = await apiClient.delete(`/api/rbac/users/${userId}/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to revoke role:', error);
      throw error;
    }
  },

  // ============================================================================
  // Permission Checks
  // ============================================================================

  /**
   * Check if current user has specific permission
   * Used for UI element visibility and action authorization
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/api/rbac/check-permission`, {
        params: { permission },
      });
      return response.data.hasPermission;
    } catch (error: any) {
      console.error('Failed to check permission:', error);
      return false;
    }
  },

  /**
   * Get all permissions for current user
   * Used to initialize authorization state in frontend
   */
  async getCurrentUserPermissions() {
    try {
      const response = await apiClient.get('/api/rbac/my-permissions');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user permissions:', error);
      throw error;
    }
  },
};
