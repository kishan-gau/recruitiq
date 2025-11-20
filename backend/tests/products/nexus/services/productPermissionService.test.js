/**
 * Product Permission Service Tests
 * Tests for product permission management functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock database and logger
const mockDbQuery = jest.fn();
const mockDb = { query: mockDbQuery };
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

const { default: service } = await import('../../../../src/products/nexus/services/productPermissionService.js');

describe('ProductPermissionService', () => {
  const productId = '123e4567-e89b-12d3-a456-426614174000';
  const permissionId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductPermissions', () => {
    it('should get all permissions for a product', async () => {
      const mockPermissions = [
        {
          id: permissionId,
          product_id: productId,
          permission_code: 'employee.create',
          name: 'Create Employee',
          description: 'Allow creating new employees'
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          product_id: productId,
          permission_code: 'employee.read',
          name: 'View Employee',
          description: 'Allow viewing employee details'
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockPermissions });

      const result = await service.getProductPermissions(productId);

      expect(result).toEqual(mockPermissions);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'SELECT * FROM product_permissions WHERE product_id = $1',
        [productId]
      );
    });

    it('should return empty array if no permissions', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getProductPermissions(productId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getProductPermissions(productId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching product permissions:', dbError);
    });
  });

  describe('createProductPermission', () => {
    it('should create a new product permission', async () => {
      const permissionData = {
        productId,
        permissionCode: 'employee.update',
        name: 'Update Employee',
        description: 'Allow updating employee details'
      };

      const mockCreatedPermission = {
        id: permissionId,
        product_id: productId,
        permission_code: permissionData.permissionCode,
        name: permissionData.name,
        description: permissionData.description
      };

      mockDbQuery.mockResolvedValue({ rows: [mockCreatedPermission] });

      const result = await service.createProductPermission(permissionData);

      expect(result).toEqual(mockCreatedPermission);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'INSERT INTO product_permissions (product_id, permission_code, name, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [
          permissionData.productId,
          permissionData.permissionCode,
          permissionData.name,
          permissionData.description
        ]
      );
    });

    it('should handle permission with minimal data', async () => {
      const permissionData = {
        productId,
        permissionCode: 'employee.delete',
        name: 'Delete Employee',
        description: null
      };

      mockDbQuery.mockResolvedValue({ rows: [permissionData] });

      const result = await service.createProductPermission(permissionData);

      expect(result.description).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Insert failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.createProductPermission({})).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating product permission:', dbError);
    });
  });

  describe('updateProductPermission', () => {
    it('should update a product permission', async () => {
      const updateData = {
        name: 'Updated Permission Name',
        description: 'Updated permission description'
      };

      const mockUpdatedPermission = {
        id: permissionId,
        product_id: productId,
        permission_code: 'employee.update',
        name: updateData.name,
        description: updateData.description
      };

      mockDbQuery.mockResolvedValue({ rows: [mockUpdatedPermission] });

      const result = await service.updateProductPermission(permissionId, updateData);

      expect(result).toEqual(mockUpdatedPermission);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'UPDATE product_permissions SET name = $1, description = $2 WHERE id = $3 RETURNING *',
        [updateData.name, updateData.description, permissionId]
      );
    });

    it('should update name only', async () => {
      const updateData = {
        name: 'New Name',
        description: 'Old Description'
      };

      mockDbQuery.mockResolvedValue({ rows: [updateData] });

      const result = await service.updateProductPermission(permissionId, updateData);

      expect(result.name).toBe('New Name');
    });

    it('should update description only', async () => {
      const updateData = {
        name: 'Old Name',
        description: 'New Description'
      };

      mockDbQuery.mockResolvedValue({ rows: [updateData] });

      const result = await service.updateProductPermission(permissionId, updateData);

      expect(result.description).toBe('New Description');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.updateProductPermission(permissionId, {})).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating product permission:', dbError);
    });
  });

  describe('deleteProductPermission', () => {
    it('should delete a product permission', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.deleteProductPermission(permissionId);

      expect(result).toBe(true);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'DELETE FROM product_permissions WHERE id = $1',
        [permissionId]
      );
    });

    it('should return true even if no rows deleted', async () => {
      mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await service.deleteProductPermission(permissionId);

      expect(result).toBe(true);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Delete failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.deleteProductPermission(permissionId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting product permission:', dbError);
    });
  });

  describe('error handling', () => {
    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockDbQuery.mockRejectedValue(timeoutError);

      await expect(service.getProductPermissions(productId)).rejects.toThrow(timeoutError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Connection pool exhausted');
      mockDbQuery.mockRejectedValue(poolError);

      await expect(service.createProductPermission({})).rejects.toThrow(poolError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle constraint violation errors', async () => {
      const constraintError = new Error('Unique constraint violation');
      mockDbQuery.mockRejectedValue(constraintError);

      await expect(service.createProductPermission({
        productId,
        permissionCode: 'duplicate.code',
        name: 'Duplicate',
        description: 'Test'
      })).rejects.toThrow(constraintError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('singleton behavior', () => {
    it('should be exported as singleton instance', () => {
      expect(service).toBeDefined();
      expect(typeof service.getProductPermissions).toBe('function');
    });

    it('should maintain state across multiple calls', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getProductPermissions(productId);
      await service.createProductPermission({});

      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });
  });
});
