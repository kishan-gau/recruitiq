import Permission from '../models/Permission.js';
import logger from '../../../utils/logger.js';

/**
 * PermissionService
 * Business logic for permission queries
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class PermissionService {
  
  permissionModel: any;

constructor(permissionModel = null) {
    this.permissionModel = permissionModel || Permission;
  }

  /**
   * List all permissions with optional filters
   */
  async list(filters = {}) {
    try {
      return await this.permissionModel.findAll(filters);
    } catch (error) {
      logger.error('Error listing permissions', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get permissions grouped by product and category
   */
  async getGrouped() {
    try {
      return await this.permissionModel.findGrouped();
    } catch (error) {
      logger.error('Error getting grouped permissions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get permissions for a specific product
   */
  async getByProduct(product) {
    try {
      return await this.permissionModel.findAll({ product });
    } catch (error) {
      logger.error('Error getting permissions by product', {
        error: error.message,
        product
      });
      throw error;
    }
  }

  /**
   * Get permission by ID
   */
  async getById(id) {
    try {
      const permission = await this.permissionModel.findById(id);
      if (!permission) {
        throw new Error('Permission not found');
      }
      return permission;
    } catch (error) {
      logger.error('Error getting permission by ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get permission by code
   */
  async getByCode(code) {
    try {
      const permission = await this.permissionModel.findByCode(code);
      if (!permission) {
        throw new Error('Permission not found');
      }
      return permission;
    } catch (error) {
      logger.error('Error getting permission by code', {
        error: error.message,
        code
      });
      throw error;
    }
  }
}

export default PermissionService;
