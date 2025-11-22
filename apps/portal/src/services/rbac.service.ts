/**
 * RBAC Service - Platform Admin Only
 * 
 * Service for Platform/System RBAC management in Portal
 * 
 * CRITICAL: Portal manages ONLY platform-level RBAC:
 * - System roles (platform admins, system operators)
 * - Platform permissions (not tenant permissions)
 * - Role templates that tenants can use
 * 
 * Portal does NOT manage:
 * - Tenant users (managed in tenant apps)
 * - Tenant role assignments (managed in tenant apps)
 * - Tenant-specific permissions
 * 
 * Architecture:
 * - Portal = Platform admin tool (manages the platform itself)
 * - Tenant Apps (Nexus, PayLinQ, etc.) = Manage their own users/roles
 */

import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

/**
 * Platform RBAC Service (Portal Admin Only)
 */
export const platformRbacService = {
  /**
   * Get system permissions (platform-level only)
   */
  async getSystemPermissions() {
    try {
      const response = await apiClient.get('/api/rbac/permissions', { 
        params: { scope: 'platform' } 
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch system permissions:', error);
      throw error;
    }
  },

  /**
   * Get all permission templates (for tenant role creation)
   */
  async getPermissionTemplates() {
    try {
      const response = await apiClient.get('/api/rbac/permissions/templates');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch permission templates:', error);
      throw error;
    }
  },

  /**
   * Get system roles (platform admin roles only)
   */
  async getSystemRoles() {
    try {
      const response = await apiClient.get('/api/rbac/roles', { 
        params: { scope: 'platform' } 
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch system roles:', error);
      throw error;
    }
  },

  /**
   * Get system roles (platform admin roles only)
   */
  async getSystemRoles() {
    try {
      const response = await apiClient.get('/api/rbac/roles', { 
        params: { scope: 'platform' } 
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch system roles:', error);
      throw error;
    }
  },

  /**
   * Get role templates (for tenants to use)
   */
  async getRoleTemplates() {
    try {
      const response = await apiClient.get('/api/rbac/roles/templates');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch role templates:', error);
      throw error;
    }
  },

  /**
   * Create system role (platform admin only)
   */
  async createSystemRole(data: {
    name: string;
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    try {
      const response = await apiClient.post('/api/rbac/roles', {
        ...data,
        scope: 'platform',
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to create system role:', error);
      throw error;
    }
  },

  /**
   * Create role template (for tenants to use)
   */
  async createRoleTemplate(data: {
    name: string;
    display_name?: string;
    description?: string;
    product?: string;
    permissionIds?: string[];
  }) {
    try {
      const response = await apiClient.post('/api/rbac/roles/templates', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create role template:', error);
      throw error;
    }
  },
};
