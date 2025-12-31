/**
 * PayrollRunTypeController Unit Tests
 * 
 * Tests for REST API endpoints for payroll run type management.
 * Tests HTTP handlers, request/response format, and multi-tenant security.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards (docs/TESTING_STANDARDS.md)
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Tests controller layer only (HTTP handling)
 * - Business logic tested in service layer
 * - Focus on request/response format and error handling
 * 
 * VERIFIED METHODS (controller functions):
 * 1. listRunTypes(req, res, next)
 * 2. getRunTypesSummary(req, res, next)
 * 3. getRunTypeByCode(req, res, next)
 * 4. getRunTypeById(req, res, next)
 * 5. createRunType(req, res, next)
 * 6. updateRunType(req, res, next)
 * 7. deleteRunType(req, res, next)
 * 8. resolveAllowedComponents(req, res, next)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock service before importing controller
const mockService = {
  list: jest.fn(),
  getByCode: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  resolveAllowedComponents: jest.fn()
};

jest.unstable_mockModule('../../../../src/products/paylinq/services/PayrollRunTypeService.js', () => ({
  default: jest.fn().mockImplementation(() => mockService)
}));

// Mock logger to prevent console output during tests
jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import controller after mocking dependencies
const controller = await import('../../../../src/products/paylinq/controllers/PayrollRunTypeController.js');

describe('PayrollRunTypeController', () => {
  let req: any;
  let res: any;
  let next: any;

  // Test constants with valid UUIDs
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testRunTypeId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    // Setup: Create fresh mock request, response, and next for each test
    req = {
      user: {
        id: testUserId,
        organizationId: testOrgId
      },
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  // ==================== listRunTypes ====================

  describe('listRunTypes', () => {
    it('should return list of run types for organization', async () => {
      // Arrange
      const mockRunTypes = [
        {
          id: testRunTypeId,
          typeCode: 'REGULAR_PAY',
          typeName: 'Regular Payroll',
          isActive: true
        },
        {
          id: '423e4567-e89b-12d3-a456-426614174003',
          typeCode: 'BONUS_PAY',
          typeName: 'Bonus Payroll',
          isActive: true
        }
      ];

      mockService.list.mockResolvedValue(mockRunTypes);

      // Act
      await controller.listRunTypes(req, res, next);

      // Assert
      expect(mockService.list).toHaveBeenCalledWith(testOrgId, false);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunTypes: mockRunTypes
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should include inactive run types when query param is true', async () => {
      // Arrange
      req.query.includeInactive = 'true';
      mockService.list.mockResolvedValue([]);

      // Act
      await controller.listRunTypes(req, res, next);

      // Assert
      expect(mockService.list).toHaveBeenCalledWith(testOrgId, true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;

      // Act
      await controller.listRunTypes(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Organization ID not found in request'
      });
      expect(mockService.list).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      // Arrange
      const error = new Error('Service error');
      mockService.list.mockRejectedValue(error);

      // Act
      await controller.listRunTypes(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ==================== getRunTypesSummary ====================

  describe('getRunTypesSummary', () => {
    it('should return summary of run types for dropdowns', async () => {
      // Arrange
      const mockRunTypes = [
        {
          id: testRunTypeId,
          typeCode: 'REGULAR_PAY',
          typeName: 'Regular Payroll'
        }
      ];

      mockService.list.mockResolvedValue(mockRunTypes);

      // Act
      await controller.getRunTypesSummary(req, res, next);

      // Assert
      expect(mockService.list).toHaveBeenCalledWith(testOrgId, false);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunTypes: expect.any(Array)
      });
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;

      // Act
      await controller.getRunTypesSummary(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Organization ID not found in request'
      });
    });

    it('should handle includeInactive query parameter', async () => {
      // Arrange
      req.query.includeInactive = 'true';
      mockService.list.mockResolvedValue([]);

      // Act
      await controller.getRunTypesSummary(req, res, next);

      // Assert
      expect(mockService.list).toHaveBeenCalledWith(testOrgId, true);
    });
  });

  // ==================== getRunTypeByCode ====================

  describe('getRunTypeByCode', () => {
    it('should return run type by code', async () => {
      // Arrange
      const typeCode = 'REGULAR_PAY';
      req.params.typeCode = typeCode;

      const mockRunType = {
        id: testRunTypeId,
        typeCode: typeCode,
        typeName: 'Regular Payroll',
        isActive: true
      };

      mockService.getByCode.mockResolvedValue(mockRunType);

      // Act
      await controller.getRunTypeByCode(req, res, next);

      // Assert
      expect(mockService.getByCode).toHaveBeenCalledWith(typeCode, testOrgId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunType: mockRunType
      });
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;
      req.params.typeCode = 'REGULAR_PAY';

      // Act
      await controller.getRunTypeByCode(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.getByCode).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws NotFoundError', async () => {
      // Arrange
      req.params.typeCode = 'NON_EXISTENT';
      const error = new Error('Run type not found');
      mockService.getByCode.mockRejectedValue(error);

      // Act
      await controller.getRunTypeByCode(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== getRunTypeById ====================

  describe('getRunTypeById', () => {
    it('should return run type by ID', async () => {
      // Arrange
      req.params.id = testRunTypeId;

      const mockRunType = {
        id: testRunTypeId,
        typeCode: 'REGULAR_PAY',
        typeName: 'Regular Payroll'
      };

      mockService.getById.mockResolvedValue(mockRunType);

      // Act
      await controller.getRunTypeById(req, res, next);

      // Assert
      expect(mockService.getById).toHaveBeenCalledWith(testRunTypeId, testOrgId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunType: mockRunType
      });
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;
      req.params.id = testRunTypeId;

      // Act
      await controller.getRunTypeById(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.getById).not.toHaveBeenCalled();
    });
  });

  // ==================== createRunType ====================

  describe('createRunType', () => {
    it('should create new run type', async () => {
      // Arrange
      const runTypeData = {
        typeCode: 'NEW_TYPE',
        typeName: 'New Payroll Type',
        componentOverrideMode: 'explicit',
        allowedComponents: ['SALARY'],
        isActive: true
      };

      req.body = runTypeData;

      const createdRunType = {
        id: testRunTypeId,
        ...runTypeData,
        organizationId: testOrgId,
        createdBy: testUserId
      };

      mockService.create.mockResolvedValue(createdRunType);

      // Act
      await controller.createRunType(req, res, next);

      // Assert
      expect(mockService.create).toHaveBeenCalledWith(
        runTypeData,
        testOrgId,
        testUserId
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunType: createdRunType
      });
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;
      req.body = { typeCode: 'TEST' };

      // Act
      await controller.createRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should return 403 when userId is missing', async () => {
      // Arrange
      req.user.id = undefined;
      req.body = { typeCode: 'TEST' };

      // Act
      await controller.createRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User ID not found in request'
      });
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should call next with validation error when invalid data', async () => {
      // Arrange
      req.body = { typeCode: '' }; // Invalid
      const error = new Error('Validation error');
      mockService.create.mockRejectedValue(error);

      // Act
      await controller.createRunType(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== updateRunType ====================

  describe('updateRunType', () => {
    it('should update existing run type', async () => {
      // Arrange
      req.params.id = testRunTypeId;
      const updates = {
        typeName: 'Updated Name',
        isActive: false
      };
      req.body = updates;

      const updatedRunType = {
        id: testRunTypeId,
        typeCode: 'REGULAR_PAY',
        ...updates,
        updatedBy: testUserId
      };

      mockService.update.mockResolvedValue(updatedRunType);

      // Act
      await controller.updateRunType(req, res, next);

      // Assert
      expect(mockService.update).toHaveBeenCalledWith(
        testRunTypeId,
        updates,
        testOrgId,
        testUserId
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunType: updatedRunType
      });
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;
      req.params.id = testRunTypeId;
      req.body = { typeName: 'Updated' };

      // Act
      await controller.updateRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should return 403 when userId is missing', async () => {
      // Arrange
      req.user.id = undefined;
      req.params.id = testRunTypeId;
      req.body = { typeName: 'Updated' };

      // Act
      await controller.updateRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should call next with error when run type not found', async () => {
      // Arrange
      req.params.id = 'non-existent-id';
      req.body = { typeName: 'Updated' };
      const error = new Error('Run type not found');
      mockService.update.mockRejectedValue(error);

      // Act
      await controller.updateRunType(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== deleteRunType ====================

  describe('deleteRunType', () => {
    it('should soft delete run type', async () => {
      // Arrange
      req.params.id = testRunTypeId;
      mockService.delete.mockResolvedValue({ success: true });

      // Act
      await controller.deleteRunType(req, res, next);

      // Assert
      expect(mockService.delete).toHaveBeenCalledWith(
        testRunTypeId,
        testOrgId,
        testUserId
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String)
      });
    });

    it('should return 403 when organizationId is missing', async () => {
      // Arrange
      req.user.organizationId = undefined;
      req.params.id = testRunTypeId;

      // Act
      await controller.deleteRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('should return 403 when userId is missing', async () => {
      // Arrange
      req.user.id = undefined;
      req.params.id = testRunTypeId;

      // Act
      await controller.deleteRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('should call next with error when deletion fails', async () => {
      // Arrange
      req.params.id = testRunTypeId;
      const error = new Error('Cannot delete - in use by payroll runs');
      mockService.delete.mockRejectedValue(error);

      // Act
      await controller.deleteRunType(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== Multi-Tenant Security Tests ====================

  describe('Multi-Tenant Security', () => {
    it('should always use organizationId from req.user', async () => {
      // Arrange
      req.body = { organizationId: 'malicious-org-id' }; // Attacker tries to override
      req.query.organizationId = 'another-malicious-id';
      mockService.list.mockResolvedValue([]);

      // Act
      await controller.listRunTypes(req, res, next);

      // Assert
      expect(mockService.list).toHaveBeenCalledWith(testOrgId, false);
      expect(mockService.list).not.toHaveBeenCalledWith('malicious-org-id', expect.any(Boolean));
      expect(mockService.list).not.toHaveBeenCalledWith('another-malicious-id', expect.any(Boolean));
    });

    it('should always use userId from req.user for create', async () => {
      // Arrange
      req.body = {
        typeCode: 'TEST',
        createdBy: 'malicious-user-id' // Attacker tries to override
      };
      mockService.create.mockResolvedValue({});

      // Act
      await controller.createRunType(req, res, next);

      // Assert
      expect(mockService.create).toHaveBeenCalledWith(
        expect.any(Object),
        testOrgId,
        testUserId // Should use auth user ID, not body createdBy
      );
    });
  });

  // ==================== Response Format Tests ====================

  describe('Response Format', () => {
    it('should use resource-specific key "payrollRunTypes" for list', async () => {
      // Arrange
      mockService.list.mockResolvedValue([]);

      // Act
      await controller.listRunTypes(req, res, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunTypes: expect.any(Array)
      });
      // Should NOT use generic "data" key
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.anything() })
      );
    });

    it('should use singular "payrollRunType" for single resource', async () => {
      // Arrange
      req.params.typeCode = 'REGULAR_PAY';
      mockService.getByCode.mockResolvedValue({});

      // Act
      await controller.getRunTypeByCode(req, res, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payrollRunType: expect.any(Object)
      });
    });

    it('should return 201 status for successful creation', async () => {
      // Arrange
      req.body = { typeCode: 'TEST' };
      mockService.create.mockResolvedValue({});

      // Act
      await controller.createRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 200 status for successful update', async () => {
      // Arrange
      req.params.id = testRunTypeId;
      req.body = { typeName: 'Updated' };
      mockService.update.mockResolvedValue({});

      // Act
      await controller.updateRunType(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
