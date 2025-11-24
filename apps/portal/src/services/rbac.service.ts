/**
 * RBAC Service - Platform Admin Only
 * 
 * Service for Platform-level RBAC management in Portal
 * 
 * CRITICAL: Portal manages ONLY platform-level RBAC:
 * - Platform admin accounts (portal users)
 * - Platform admin roles (who can access portal features)
 * - Platform-level permissions
 * 
 * Portal does NOT manage:
 * - Tenant users (managed in tenant apps)
 * - Tenant roles (managed in tenant apps)
 * - Product permissions (defined in each product)
 * - "Role templates" (each product has its own system roles)
 * 
 * Architecture:
 * - Portal = Platform admin tool (manages access to portal itself)
 * - Tenant Apps = Each product manages its own RBAC completely
 * - System Roles = Pre-seeded in each product during migration (not managed by portal)
 * 
 * Example:
 * - Portal permissions: "customers:view", "metrics:view", "licenses:manage"
 * - Portal roles: "Platform Admin", "Support Staff", "Billing Manager"
 * - Nexus permissions: "employee:view", "department:edit" (defined in Nexus, not portal)
 * - Nexus system roles: "HR Manager", "Employee Viewer" (seeded with Nexus, not from portal)
 */

import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

/**
 * Platform RBAC Service (Portal Admin Only)
 * 
 * Manages RBAC for the Portal application itself:
 * - Who can access the portal
 * - What they can do in the portal (manage customers, view metrics, etc.)
 */
export const platformRbacService = {
  /**
   * Get platform admin permissions
   * These control access to portal features only (not tenant features)
   * 
   * Example permissions:
   * - customers:view - View customer list
   * - customers:manage - Create/edit/delete customers
   * - licenses:manage - Manage license assignments
   * - metrics:view - View platform metrics
   * - billing:manage - Manage billing settings
   */
  async getPlatformPermissions() {
    try {
      const response = await apiClient.get('/api/platform/rbac/permissions');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch platform permissions:', error);
      throw error;
    }
  },

  /**
   * Get platform admin roles
   * These control who can access the portal (not tenant apps)
   * 
   * Example roles:
   * - Platform Admin - Full portal access
   * - Support Staff - View customers, access support features
   * - Billing Manager - Manage licenses and billing
   * - Metrics Viewer - View platform analytics
   */
  async getPlatformRoles() {
    try {
      const response = await apiClient.get('/api/platform/rbac/roles');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch platform roles:', error);
      throw error;
    }
  },

  /**
   * Get single platform role
   */
  async getPlatformRole(roleId: string) {
    try {
      const response = await apiClient.get(`/api/platform/rbac/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch platform role:', error);
      throw error;
    }
  },

  /**
   * Create platform admin role
   * For managing access to portal features only
   */
  async createPlatformRole(data: {
    name: string;
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    try {
      const response = await apiClient.post('/api/platform/rbac/roles', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create platform role:', error);
      throw error;
    }
  },

  /**
   * Update platform role
   */
  async updatePlatformRole(roleId: string, data: {
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    try {
      const response = await apiClient.patch(`/api/platform/rbac/roles/${roleId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update platform role:', error);
      throw error;
    }
  },

  /**
   * Delete platform role
   */
  async deletePlatformRole(roleId: string) {
    try {
      const response = await apiClient.delete(`/api/platform/rbac/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to delete platform role:', error);
      throw error;
    }
  },

  /**
   * Get platform admin users (portal users)
   */
  async getPlatformUsers() {
    try {
      const response = await apiClient.get('/api/platform/rbac/users');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch platform users:', error);
      throw error;
    }
  },

  /**
   * Get roles assigned to a platform user
   */
  async getPlatformUserRoles(userId: string) {
    try {
      const response = await apiClient.get(`/api/platform/rbac/users/${userId}/roles`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch platform user roles:', error);
      throw error;
    }
  },

  /**
   * Assign platform role to portal admin user
   */
  async assignPlatformRole(userId: string, roleId: string) {
    try {
      const response = await apiClient.post(`/api/platform/rbac/users/${userId}/roles`, {
        roleId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to assign platform role:', error);
      throw error;
    }
  },

  /**
   * Revoke platform role from user
   */
  async revokePlatformRole(userId: string, roleId: string) {
    try {
      const response = await apiClient.delete(`/api/platform/rbac/users/${userId}/roles/${roleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to revoke platform role:', error);
      throw error;
    }
  },
};
