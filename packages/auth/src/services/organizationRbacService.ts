/**
 * Organization RBAC Service
 * 
 * Centralized RBAC management for multi-product tenant organizations.
 * 
 * This service provides a unified interface for managing users, roles, and permissions
 * across ALL products that an organization has licensed (Nexus, PayLinQ, ScheduleHub, etc.).
 * 
 * Key Features:
 * - Accessible from ANY tenant app's Settings page
 * - Shows unified view of all licensed products
 * - Product-aware permissions (grouped by product)
 * - License-based filtering (only shows licensed products)
 * - System roles (pre-seeded) + custom roles (org-created)
 * 
 * Architecture:
 * - Data is organization-scoped (not app-scoped)
 * - Backend filters by organization licenses automatically
 * - Same view from Nexus, PayLinQ, or ScheduleHub Settings
 * 
 * Example Usage:
 * ```typescript
 * import { organizationRbacService } from '@recruitiq/auth';
 * 
 * // Get permissions for all licensed products
 * const permissions = await organizationRbacService.getPermissions();
 * // Returns: { nexus: [...], paylinq: [...], schedulehub: [...] }
 * 
 * // Get roles across all licensed products
 * const roles = await organizationRbacService.getRoles();
 * // Returns: { nexus: [...], paylinq: [...], schedulehub: [...] }
 * 
 * // Assign PayLinQ role to user (even from Nexus Settings page)
 * await organizationRbacService.assignRole(userId, paylinqRoleId);
 * ```
 */

import { APIClient } from '@recruitiq/api-client';

export interface Permission {
  id: string;
  code: string; // e.g., 'employee:view', 'payroll:run'
  name: string;
  description?: string;
  product: string; // 'nexus', 'paylinq', 'schedulehub', etc.
  category?: string; // 'employee', 'payroll', 'schedule'
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  product: string; // Which product this role belongs to
  isSystem: boolean; // System role (pre-seeded) vs custom role
  organizationId?: string; // NULL for system roles
  permissions: Permission[];
  userCount?: number; // Number of users with this role
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  roles: Role[]; // All roles across all products
  createdAt: string;
}

export interface PermissionsGrouped {
  [product: string]: Permission[];
}

export interface RolesGrouped {
  [product: string]: Role[];
}

/**
 * Organization RBAC Service
 * 
 * Manages RBAC for the entire organization across all licensed products.
 */
export class OrganizationRbacService {
  constructor(private apiClient: APIClient) {}

  // ==================== PERMISSIONS ====================

  /**
   * Get all permissions for licensed products
   * 
   * Backend automatically filters based on organization's licenses.
   * Returns permissions grouped by product.
   * 
   * Example Response:
   * {
   *   nexus: [
   *     { code: 'employee:view', name: 'View Employees', product: 'nexus' },
   *     { code: 'employee:edit', name: 'Edit Employees', product: 'nexus' },
   *   ],
   *   paylinq: [
   *     { code: 'payroll:view', name: 'View Payroll', product: 'paylinq' },
   *     { code: 'payroll:run', name: 'Run Payroll', product: 'paylinq' },
   *   ]
   * }
   */
  async getPermissions(): Promise<PermissionsGrouped> {
    try {
      const response = await this.apiClient.get('/api/rbac/permissions');
      return response.data.permissions;
    } catch (error: any) {
      console.error('Failed to fetch permissions:', error);
      throw error;
    }
  }

  /**
   * Get permissions for specific product
   */
  async getPermissionsByProduct(product: string): Promise<Permission[]> {
    try {
      const response = await this.apiClient.get('/api/rbac/permissions', {
        params: { product },
      });
      return response.data.permissions;
    } catch (error: any) {
      console.error(`Failed to fetch permissions for ${product}:`, error);
      throw error;
    }
  }

  // ==================== ROLES ====================

  /**
   * Get all roles for licensed products
   * 
   * Returns both system roles (pre-seeded) and custom roles (created by org).
   * Grouped by product.
   * 
   * Example Response:
   * {
   *   nexus: [
   *     { name: 'hr_manager', displayName: 'HR Manager', isSystem: true },
   *     { name: 'regional_hr', displayName: 'Regional HR', isSystem: false },
   *   ],
   *   paylinq: [
   *     { name: 'payroll_approver', displayName: 'Payroll Approver', isSystem: true },
   *   ]
   * }
   */
  async getRoles(): Promise<RolesGrouped> {
    try {
      const response = await this.apiClient.get('/api/rbac/roles');
      return response.data.roles;
    } catch (error: any) {
      console.error('Failed to fetch roles:', error);
      throw error;
    }
  }

  /**
   * Get single role by ID
   */
  async getRole(roleId: string): Promise<Role> {
    try {
      const response = await this.apiClient.get(`/api/rbac/roles/${roleId}`);
      return response.data.role;
    } catch (error: any) {
      console.error('Failed to fetch role:', error);
      throw error;
    }
  }

  /**
   * Get roles for specific product
   */
  async getRolesByProduct(product: string): Promise<Role[]> {
    try {
      const response = await this.apiClient.get('/api/rbac/roles', {
        params: { product },
      });
      return response.data.roles;
    } catch (error: any) {
      console.error(`Failed to fetch roles for ${product}:`, error);
      throw error;
    }
  }

  /**
   * Create custom role for specific product
   * 
   * @param data Role creation data
   * @param data.product Which product this role is for ('nexus', 'paylinq', etc.)
   * @param data.name Role name (unique within org+product)
   * @param data.displayName Human-readable name
   * @param data.description Role description
   * @param data.permissionIds Array of permission IDs to assign
   * 
   * Example:
   * ```typescript
   * await organizationRbacService.createRole({
   *   product: 'nexus',
   *   name: 'regional_hr_manager',
   *   displayName: 'Regional HR Manager',
   *   description: 'Manages HR for specific region',
   *   permissionIds: ['perm-uuid-1', 'perm-uuid-2']
   * });
   * ```
   */
  async createRole(data: {
    product: string;
    name: string;
    displayName?: string;
    description?: string;
    permissionIds: string[];
  }): Promise<Role> {
    try {
      const response = await this.apiClient.post('/api/rbac/roles', data);
      return response.data.role;
    } catch (error: any) {
      console.error('Failed to create role:', error);
      throw error;
    }
  }

  /**
   * Update custom role
   * 
   * Note: Cannot update system roles (isSystem = true)
   */
  async updateRole(
    roleId: string,
    data: {
      displayName?: string;
      description?: string;
      permissionIds?: string[];
    }
  ): Promise<Role> {
    try {
      const response = await this.apiClient.patch(`/api/rbac/roles/${roleId}`, data);
      return response.data.role;
    } catch (error: any) {
      console.error('Failed to update role:', error);
      throw error;
    }
  }

  /**
   * Delete custom role
   * 
   * Note: Cannot delete system roles (isSystem = true)
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/api/rbac/roles/${roleId}`);
    } catch (error: any) {
      console.error('Failed to delete role:', error);
      throw error;
    }
  }

  /**
   * Clone role (create custom copy of system role)
   * 
   * Useful when org wants to customize a system role.
   * 
   * Example:
   * ```typescript
   * // Clone "HR Manager" system role to customize it
   * const customRole = await organizationRbacService.cloneRole(
   *   'system-hr-manager-uuid',
   *   'custom_hr_manager',
   *   'Custom HR Manager'
   * );
   * ```
   */
  async cloneRole(
    sourceRoleId: string,
    newName: string,
    newDisplayName?: string
  ): Promise<Role> {
    try {
      const response = await this.apiClient.post(`/api/rbac/roles/${sourceRoleId}/clone`, {
        name: newName,
        displayName: newDisplayName,
      });
      return response.data.role;
    } catch (error: any) {
      console.error('Failed to clone role:', error);
      throw error;
    }
  }

  // ==================== USERS ====================

  /**
   * Get all users in organization
   * 
   * Returns all users with their assigned roles across all products.
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await this.apiClient.get('/api/rbac/users');
      return response.data.users;
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  /**
   * Get single user with their roles
   */
  async getUser(userId: string): Promise<User> {
    try {
      const response = await this.apiClient.get(`/api/rbac/users/${userId}`);
      return response.data.user;
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  }

  /**
   * Get user's assigned roles (across all products)
   * 
   * Returns roles grouped by product.
   */
  async getUserRoles(userId: string): Promise<RolesGrouped> {
    try {
      const response = await this.apiClient.get(`/api/rbac/users/${userId}/roles`);
      return response.data.roles;
    } catch (error: any) {
      console.error('Failed to fetch user roles:', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   * 
   * Can assign roles from ANY licensed product, regardless of which app you're in.
   * 
   * Example:
   * ```typescript
   * // In Nexus Settings, assign PayLinQ role to user
   * await organizationRbacService.assignRole(userId, paylinqRoleId);
   * ```
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    try {
      await this.apiClient.post(`/api/rbac/users/${userId}/roles`, {
        roleId,
      });
    } catch (error: any) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/api/rbac/users/${userId}/roles/${roleId}`);
    } catch (error: any) {
      console.error('Failed to revoke role:', error);
      throw error;
    }
  }

  /**
   * Bulk assign roles to user
   * 
   * Useful for assigning multiple roles at once.
   */
  async bulkAssignRoles(userId: string, roleIds: string[]): Promise<void> {
    try {
      await this.apiClient.post(`/api/rbac/users/${userId}/roles/bulk`, {
        roleIds,
      });
    } catch (error: any) {
      console.error('Failed to bulk assign roles:', error);
      throw error;
    }
  }

  /**
   * Replace user's roles (remove all existing, add new ones)
   */
  async replaceUserRoles(userId: string, roleIds: string[]): Promise<void> {
    try {
      await this.apiClient.put(`/api/rbac/users/${userId}/roles`, {
        roleIds,
      });
    } catch (error: any) {
      console.error('Failed to replace user roles:', error);
      throw error;
    }
  }

  // ==================== SEARCH & FILTER ====================

  /**
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await this.apiClient.get('/api/rbac/users', {
        params: { search: query },
      });
      return response.data.users;
    } catch (error: any) {
      console.error('Failed to search users:', error);
      throw error;
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: string): Promise<User[]> {
    try {
      const response = await this.apiClient.get(`/api/rbac/roles/${roleId}/users`);
      return response.data.users;
    } catch (error: any) {
      console.error('Failed to fetch users by role:', error);
      throw error;
    }
  }

  /**
   * Get users with specific permission
   */
  async getUsersByPermission(permissionCode: string): Promise<User[]> {
    try {
      const response = await this.apiClient.get('/api/rbac/users', {
        params: { permission: permissionCode },
      });
      return response.data.users;
    } catch (error: any) {
      console.error('Failed to fetch users by permission:', error);
      throw error;
    }
  }
}

// Singleton instance
const apiClient = new APIClient();
export const organizationRbacService = new OrganizationRbacService(apiClient);
