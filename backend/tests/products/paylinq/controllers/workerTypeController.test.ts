/**
 * Worker Type Controller Unit Tests
 * 
 * Tests for PayLinQ worker type controller HTTP handlers.
 * Covers worker type/classification management including CRUD operations.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Mock req/res objects
 * - Service layer mocking
 * - EXACT method names from controller (verified against source)
 * 
 * VERIFIED METHODS (from source analysis):
 * 1. createWorkerType(req, res)
 * 2. getWorkerTypes(req, res)
 * 3. getWorkerTypeById(req, res)
 * 4. updateWorkerType(req, res)
 * 5. deleteWorkerType(req, res)
 * 6. assignWorkerType(req, res)
 * 7. assignEmployees(req, res)
 * 8. getWorkerTypeEmployees(req, res)
 * 9. getTemplateInclusions(req, res)
 * 10. addTemplateInclusion(req, res)
 * 11. updateTemplateInclusion(req, res)
 * 12. removeTemplateInclusion(req, res)
 * 13. getUpgradeStatus(req, res)
 * 14. previewUpgrade(req, res)
 * 15. upgradeWorkers(req, res)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock service methods
const mockCreateWorkerTypeTemplate = jest.fn();
const mockGetWorkerTypes = jest.fn();
const mockGetWorkerTypeTemplateById = jest.fn();
const mockUpdateWorkerTypeTemplate = jest.fn();
const mockDeleteWorkerTypeTemplate = jest.fn();
const mockAssignWorkerTypeToEmployee = jest.fn();
const mockBulkAssignWorkerType = jest.fn();
const mockGetEmployeesWithWorkerType = jest.fn();
const mockGetWorkerTypeInclusions = jest.fn();
const mockAddWorkerTypeInclusion = jest.fn();
const mockUpdateWorkerTypeInclusion = jest.fn();
const mockRemoveWorkerTypeInclusion = jest.fn();
const mockGetWorkerUpgradeStatus = jest.fn();
const mockPreviewWorkerUpgrade = jest.fn();
const mockUpgradeWorkers = jest.fn();

// Mock worker type service
jest.unstable_mockModule('../../../../src/products/paylinq/services/workerTypeService.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    createWorkerTypeTemplate: mockCreateWorkerTypeTemplate,
    getWorkerTypes: mockGetWorkerTypes,
    getWorkerTypeTemplateById: mockGetWorkerTypeTemplateById,
    updateWorkerTypeTemplate: mockUpdateWorkerTypeTemplate,
    deleteWorkerTypeTemplate: mockDeleteWorkerTypeTemplate,
    assignWorkerTypeToEmployee: mockAssignWorkerTypeToEmployee,
    bulkAssignWorkerType: mockBulkAssignWorkerType,
    getEmployeesWithWorkerType: mockGetEmployeesWithWorkerType,
    getWorkerTypeInclusions: mockGetWorkerTypeInclusions,
    addWorkerTypeInclusion: mockAddWorkerTypeInclusion,
    updateWorkerTypeInclusion: mockUpdateWorkerTypeInclusion,
    removeWorkerTypeInclusion: mockRemoveWorkerTypeInclusion,
    getWorkerUpgradeStatus: mockGetWorkerUpgradeStatus,
    previewWorkerUpgrade: mockPreviewWorkerUpgrade,
    upgradeWorkers: mockUpgradeWorkers
  }))
}));

// Mock DTO mapper
jest.unstable_mockModule('../../../../src/products/paylinq/utils/dtoMapper.js', () => ({
  mapApiToDb: jest.fn((data) => data)
}));

// Mock logger
jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import controller after mocking
const workerTypeControllerModule = await import('../../../../src/products/paylinq/controllers/workerTypeController.js');
const workerTypeController = workerTypeControllerModule.default;

describe('Worker Type Controller', () => {
  let mockReq: any;
  let mockRes: any;

  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testWorkerTypeId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockReq = {
      user: {
        id: testUserId,
        organization_id: testOrgId
      },
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  // ==================== createWorkerType ====================

  describe('createWorkerType', () => {
    it('should create worker type successfully', async () => {
      // Arrange
      const workerTypeData = {
        name: 'Full-Time Employee',
        code: 'FTE',
        payType: 'salary'
      };
      mockReq.body = workerTypeData;
      
      const createdWorkerType = { id: testWorkerTypeId, ...workerTypeData };
      mockCreateWorkerTypeTemplate.mockResolvedValue(createdWorkerType);

      // Act
      await workerTypeController.createWorkerType(mockReq, mockRes);

      // Assert
      expect(mockCreateWorkerTypeTemplate).toHaveBeenCalledWith(
        workerTypeData,
        testOrgId,
        testUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        workerType: createdWorkerType,
        message: 'Worker type created successfully'
      });
    });

    it('should return 403 when tier limit reached', async () => {
      // Arrange
      mockReq.body = { name: 'Test Worker' };
      mockCreateWorkerTypeTemplate.mockRejectedValue(
        new Error('Worker type limit reached for your plan')
      );

      // Act
      await workerTypeController.createWorkerType(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Worker type limit reached for your plan',
        errorCode: 'TIER_LIMIT_REACHED'
      });
    });

    it('should return 409 when worker type already exists', async () => {
      // Arrange
      mockReq.body = { name: 'Existing Worker', code: 'EW' };
      mockCreateWorkerTypeTemplate.mockRejectedValue(
        new Error('Worker type with code EW already exists')
      );

      // Act
      await workerTypeController.createWorkerType(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Worker type with code EW already exists',
        errorCode: 'CONFLICT'
      });
    });

    it('should return 400 on validation error', async () => {
      // Arrange
      mockReq.body = { name: '' };
      mockCreateWorkerTypeTemplate.mockRejectedValue(
        new Error('Name is required')
      );

      // Act
      await workerTypeController.createWorkerType(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name is required',
        errorCode: 'VALIDATION_ERROR'
      });
    });
  });

  // ==================== getWorkerTypes ====================

  describe('getWorkerTypes', () => {
    it('should return paginated worker types with default params', async () => {
      // Arrange
      const result = {
        workerTypes: [
          { id: '1', name: 'Full-Time' },
          { id: '2', name: 'Part-Time' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };
      mockGetWorkerTypes.mockResolvedValue(result);

      // Act
      await workerTypeController.getWorkerTypes(mockReq, mockRes);

      // Assert
      expect(mockGetWorkerTypes).toHaveBeenCalledWith(
        testOrgId,
        { page: 1, limit: 20 },
        expect.any(Object),
        { sortBy: 'name', sortOrder: 'asc' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        workerTypes: result.workerTypes,
        pagination: result.pagination
      });
    });

    it('should handle pagination and filters', async () => {
      // Arrange
      mockReq.query = {
        page: '2',
        limit: '50',
        status: 'active',
        payType: 'hourly',
        search: 'contractor'
      };
      
      const result = {
        workerTypes: [],
        pagination: { page: 2, limit: 50, total: 0, totalPages: 0 }
      };
      mockGetWorkerTypes.mockResolvedValue(result);

      // Act
      await workerTypeController.getWorkerTypes(mockReq, mockRes);

      // Assert
      expect(mockGetWorkerTypes).toHaveBeenCalledWith(
        testOrgId,
        { page: 2, limit: 50 },
        expect.objectContaining({
          status: 'active',
          payType: 'hourly',
          search: 'contractor'
        }),
        { sortBy: 'name', sortOrder: 'asc' }
      );
    });

    it('should return 500 on service error', async () => {
      // Arrange
      mockGetWorkerTypes.mockRejectedValue(new Error('Database error'));

      // Act
      await workerTypeController.getWorkerTypes(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch worker types',
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
    });
  });

  // ==================== getWorkerTypeById ====================

  describe('getWorkerTypeById', () => {
    it('should return worker type by ID', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      const workerType = {
        id: testWorkerTypeId,
        name: 'Full-Time Employee',
        code: 'FTE'
      };
      mockGetWorkerTypeTemplateById.mockResolvedValue(workerType);

      // Act
      await workerTypeController.getWorkerTypeById(mockReq, mockRes);

      // Assert
      expect(mockGetWorkerTypeTemplateById).toHaveBeenCalledWith(
        testWorkerTypeId,
        testOrgId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        workerType: workerType
      });
    });

    it('should return 404 when worker type not found', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      mockGetWorkerTypeTemplateById.mockRejectedValue(
        new Error('Worker type not found')
      );

      // Act
      await workerTypeController.getWorkerTypeById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Worker type not found',
        errorCode: 'NOT_FOUND'
      });
    });

    it('should return 403 when access denied', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      mockGetWorkerTypeTemplateById.mockRejectedValue(
        new Error('Access denied to worker type')
      );

      // Act
      await workerTypeController.getWorkerTypeById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN'
      });
    });
  });

  // ==================== updateWorkerType ====================

  describe('updateWorkerType', () => {
    it('should update worker type successfully', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      mockReq.body = { name: 'Updated Name' };
      
      const updatedWorkerType = {
        id: testWorkerTypeId,
        name: 'Updated Name'
      };
      mockUpdateWorkerTypeTemplate.mockResolvedValue(updatedWorkerType);

      // Act
      await workerTypeController.updateWorkerType(mockReq, mockRes);

      // Assert
      expect(mockUpdateWorkerTypeTemplate).toHaveBeenCalledWith(
        testWorkerTypeId,
        { name: 'Updated Name' },
        testOrgId,
        testUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        workerType: updatedWorkerType,
        message: 'Worker type updated successfully'
      });
    });

    it('should return 404 when worker type not found', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      mockReq.body = { name: 'New Name' };
      mockUpdateWorkerTypeTemplate.mockRejectedValue(
        new Error('Worker type not found')
      );

      // Act
      await workerTypeController.updateWorkerType(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Worker type not found',
        errorCode: 'NOT_FOUND'
      });
    });

    it('should return 403 when access denied', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      mockReq.body = { name: 'New Name' };
      mockUpdateWorkerTypeTemplate.mockRejectedValue(
        new Error('Access denied')
      );

      // Act
      await workerTypeController.updateWorkerType(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN'
      });
    });
  });

  // ==================== deleteWorkerType ====================

  describe('deleteWorkerType', () => {
    it('should delete worker type successfully', async () => {
      // Arrange
      mockReq.params.id = testWorkerTypeId;
      mockDeleteWorkerTypeTemplate.mockResolvedValue({ success: true });

      // Act
      await workerTypeController.deleteWorkerType(mockReq, mockRes);

      // Assert
      expect(mockDeleteWorkerTypeTemplate).toHaveBeenCalledWith(
        testWorkerTypeId,
        testOrgId,
        testUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Worker type deleted successfully'
      });
    });
  });

  // ==================== Default Export ====================

  describe('default export', () => {
    it('should export all controller methods', () => {
      expect(workerTypeController).toBeDefined();
      expect(workerTypeController.createWorkerType).toBeDefined();
      expect(workerTypeController.getWorkerTypes).toBeDefined();
      expect(workerTypeController.getWorkerTypeById).toBeDefined();
      expect(workerTypeController.updateWorkerType).toBeDefined();
      expect(workerTypeController.deleteWorkerType).toBeDefined();
    });

    it('should have all methods as functions', () => {
      expect(typeof workerTypeController.createWorkerType).toBe('function');
      expect(typeof workerTypeController.getWorkerTypes).toBe('function');
      expect(typeof workerTypeController.getWorkerTypeById).toBe('function');
      expect(typeof workerTypeController.updateWorkerType).toBe('function');
      expect(typeof workerTypeController.deleteWorkerType).toBe('function');
    });
  });
});
