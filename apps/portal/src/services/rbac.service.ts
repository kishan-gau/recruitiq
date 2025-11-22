/**
 * RBAC Service
 * 
 * Service for Role-Based Access Control management in Portal
 * Handles roles, permissions, and user role assignments
 */

import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

/**
 * RBAC Service
 */
export const rbacService = {
  /**
   * Get all permissions
   */
  async getPermissions(filters?: { product?: string; category?: string }) {
    try {
      const response = await apiClient.get('/api/rbac/permissions', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch permissions:', error);
      throw error;
    }
  },

  /**
   * Get grouped permissions (by product and category)
   */
  async getGroupedPermissions() {
    try {
      const response = await apiClient.get('/api/rbac/permissions/grouped');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch grouped permissions:', error);
      throw error;
    }
  },

  /**
   * Get all roles
   */
  async getRoles(filters?: { product?: string; includeSystem?: boolean }) {
    try {
      const response = await apiClient.get('/api/rbac/roles', { params: filters });
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
      const response = await apiClient.get(`/api/rbac/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch role:', error);
      throw error;
    }
  },

  /**
   * Create new role
   */
  async createRole(data: {
    name: string;
    display_name?: string;
    description?: string;
    product?: string;
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
   * Update existing role
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
   * Delete role
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

  /**
   * Assign permissions to role
   */
  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    try {
      const response = await apiClient.post(`/api/rbac/roles/${roleId}/permissions`, {
        permissionIds,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to assign permissions:', error);
      throw error;
    }
  },

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string, product?: string) {
    try {
      const params = product ? { product } : {};
      const response = await apiClient.get(`/api/rbac/user-roles/${userId}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user roles:', error);
      throw error;
    }
  },

  /**
   * Get user's permissions
   */
  async getUserPermissions(userId: string, product?: string) {
    try {
      const params = product ? { product } : {};
      const response = await apiClient.get(`/api/rbac/user-roles/${userId}/permissions`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user permissions:', error);
      throw error;
    }
  },

  /**
   * Assign role to user
   */
  async assignRoleToUser(data: { userId: string; roleId: string; product?: string }) {
    try {
      const response = await apiClient.post('/api/rbac/user-roles', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to assign role to user:', error);
      throw error;
    }
  },

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(userId: string, roleId: string, product?: string) {
    try {
      const params = product ? { product } : {};
      const response = await apiClient.delete(`/api/rbac/user-roles/${userId}/roles/${roleId}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Failed to revoke role from user:', error);
      throw error;
    }
  },
};
