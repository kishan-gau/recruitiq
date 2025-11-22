/**
 * Tenant RBAC Service
 * 
 * Service for tenant-level RBAC management in product apps
 * Each tenant app (Nexus, PayLinQ, etc.) manages its own users and roles
 * 
 * ARCHITECTURE:
 * - Tenant apps manage their own organization's users
 * - Each organization has isolated roles and permissions
 * - Role assignments are scoped to organizationId
 * - Uses product-specific API endpoints
 * 
 * @module tenant-rbac-service
 */

import { APIClient } from '@recruitiq/api-client';

/**
 * Creates a tenant RBAC service for a specific product
 * 
 * @param product - Product slug (e.g., 'nexus', 'paylinq')
 * @returns Tenant RBAC service instance
 * 
 * @example
 * ```typescript
 * // In Nexus app
 * const rbacService = createTenantRbacService('nexus');
 * 
 * // Get roles for current organization
 * const roles = await rbacService.getRoles();
 * 
 * // Assign role to user in organization
 * await rbacService.assignRoleToUser(userId, roleId);
 * ```
 */
export function createTenantRbacService(product: string) {
  const apiClient = new APIClient();

  return {
    /**
     * Get all roles for current organization
     * Automatically scoped to organizationId by backend
     */
    async getRoles() {
      try {
        const response = await apiClient.get(`/api/products/${product}/rbac/roles`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch roles:', error);
        throw error;
      }
    },

    /**
     * Get single role by ID
     */
    async getRole(roleId: string) {
      try {
        const response = await apiClient.get(`/api/products/${product}/rbac/roles/${roleId}`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch role:', error);
        throw error;
      }
    },

    /**
     * Get available permissions for this product
     */
    async getPermissions() {
      try {
        const response = await apiClient.get(`/api/products/${product}/rbac/permissions`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch permissions:', error);
        throw error;
      }
    },

    /**
     * Get grouped permissions (by category)
     */
    async getGroupedPermissions() {
      try {
        const response = await apiClient.get(`/api/products/${product}/rbac/permissions/grouped`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch grouped permissions:', error);
        throw error;
      }
    },

    /**
     * Create custom role for organization
     */
    async createRole(data: {
      name: string;
      display_name?: string;
      description?: string;
      permissionIds?: string[];
    }) {
      try {
        const response = await apiClient.post(`/api/products/${product}/rbac/roles`, data);
        return response.data;
      } catch (error: any) {
        console.error('Failed to create role:', error);
        throw error;
      }
    },

    /**
     * Update existing role
     */
    async updateRole(roleId: string, data: {
      display_name?: string;
      description?: string;
      permissionIds?: string[];
    }) {
      try {
        const response = await apiClient.patch(`/api/products/${product}/rbac/roles/${roleId}`, data);
        return response.data;
      } catch (error: any) {
        console.error('Failed to update role:', error);
        throw error;
      }
    },

    /**
     * Delete custom role
     * System roles cannot be deleted
     */
    async deleteRole(roleId: string) {
      try {
        const response = await apiClient.delete(`/api/products/${product}/rbac/roles/${roleId}`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to delete role:', error);
        throw error;
      }
    },

    /**
     * Get user's roles in current organization
     */
    async getUserRoles(userId: string) {
      try {
        const response = await apiClient.get(`/api/products/${product}/rbac/users/${userId}/roles`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch user roles:', error);
        throw error;
      }
    },

    /**
     * Get user's effective permissions
     */
    async getUserPermissions(userId: string) {
      try {
        const response = await apiClient.get(`/api/products/${product}/rbac/users/${userId}/permissions`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch user permissions:', error);
        throw error;
      }
    },

    /**
     * Assign role to user in current organization
     */
    async assignRoleToUser(userId: string, roleId: string) {
      try {
        const response = await apiClient.post(`/api/products/${product}/rbac/users/${userId}/roles`, {
          roleId,
        });
        return response.data;
      } catch (error: any) {
        console.error('Failed to assign role to user:', error);
        throw error;
      }
    },

    /**
     * Revoke role from user
     */
    async revokeRoleFromUser(userId: string, roleId: string) {
      try {
        const response = await apiClient.delete(`/api/products/${product}/rbac/users/${userId}/roles/${roleId}`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to revoke role from user:', error);
        throw error;
      }
    },

    /**
     * Get all users in current organization (for role assignment UI)
     */
    async getOrganizationUsers() {
      try {
        const response = await apiClient.get(`/api/products/${product}/users`);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch organization users:', error);
        throw error;
      }
    },
  };
}

/**
 * Type definition for tenant RBAC service
 */
export type TenantRbacService = ReturnType<typeof createTenantRbacService>;
