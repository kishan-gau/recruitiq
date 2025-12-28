import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

/**
 * Service for managing scheduling roles
 */
export const rolesService = {
  /**
   * Lists all roles with optional filters
   */
  async listRoles(filters?: any) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/roles', {
        params: filters,
      });
      return response.data.roles || response.data || [];
    } catch (error) {
      console.error('Failed to list roles:', error);
      throw error;
    }
  },

  /**
   * Gets a single role by ID
   */
  async getRole(id: string) {
    try {
      const response = await apiClient.get(`/api/products/schedulehub/roles/${id}`);
      return response.data.role || response.data;
    } catch (error) {
      console.error(`Failed to get role ${id}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new role
   */
  async createRole(data: any) {
    try {
      const response = await apiClient.post('/api/products/schedulehub/roles', data);
      return response.data.role || response.data;
    } catch (error) {
      console.error('Failed to create role:', error);
      throw error;
    }
  },

  /**
   * Updates an existing role
   */
  async updateRole(id: string, updates: any) {
    try {
      const response = await apiClient.put(`/api/products/schedulehub/roles/${id}`, updates);
      return response.data.role || response.data;
    } catch (error) {
      console.error(`Failed to update role ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a role
   */
  async deleteRole(id: string) {
    try {
      const response = await apiClient.delete(`/api/products/schedulehub/roles/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete role ${id}:`, error);
      throw error;
    }
  },
};
