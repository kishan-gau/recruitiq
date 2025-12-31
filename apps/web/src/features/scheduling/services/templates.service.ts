/**
 * Shift Templates Service
 * API service for shift template management
 */

import { apiClient } from '@recruitiq/api-client';

export const templatesService = {
  /**
   * Get all shift templates with optional filters
   */
  async getShiftTemplates(filters?: any) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/shift-templates', {
        params: filters,
      });
      return response.data.templates || response.data;
    } catch (error) {
      console.error('Failed to get shift templates:', error);
      throw error;
    }
  },

  /**
   * Get a single shift template by ID
   */
  async getShiftTemplate(id: string) {
    try {
      const response = await apiClient.get(`/api/products/schedulehub/shift-templates/${id}`);
      return response.data.template || response.data;
    } catch (error) {
      console.error(`Failed to get shift template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new shift template
   */
  async createShiftTemplate(data: any) {
    try {
      const response = await apiClient.post('/api/products/schedulehub/shift-templates', data);
      return response.data.template || response.data;
    } catch (error) {
      console.error('Failed to create shift template:', error);
      throw error;
    }
  },

  /**
   * Update an existing shift template
   */
  async updateShiftTemplate(id: string, updates: any) {
    try {
      const response = await apiClient.put(`/api/products/schedulehub/shift-templates/${id}`, updates);
      return response.data.template || response.data;
    } catch (error) {
      console.error(`Failed to update shift template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a shift template (soft delete)
   */
  async deleteShiftTemplate(id: string) {
    try {
      await apiClient.delete(`/api/products/schedulehub/shift-templates/${id}`);
    } catch (error) {
      console.error(`Failed to delete shift template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Duplicate an existing shift template
   */
  async duplicateShiftTemplate(id: string, name: string) {
    try {
      const response = await apiClient.post(`/api/products/schedulehub/shift-templates/${id}/duplicate`, {
        name,
      });
      return response.data.template || response.data;
    } catch (error) {
      console.error(`Failed to duplicate shift template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Validate a shift template
   */
  async validateShiftTemplate(data: any) {
    try {
      const response = await apiClient.post('/api/products/schedulehub/shift-templates/validate', data);
      return response.data;
    } catch (error) {
      console.error('Failed to validate shift template:', error);
      throw error;
    }
  },
};
