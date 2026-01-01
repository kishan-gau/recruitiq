/**
 * Tests for compensation.service.ts
 * 
 * Tests the service layer for compensation management operations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock instances that will be used by the service
const mockApiClientInstance = {};
const mockPaylinqClientInstance = {
  getCompensation: vi.fn(),
  getCompensationById: vi.fn(),
  createCompensation: vi.fn(),
  updateCompensation: vi.fn(),
  deleteCompensation: vi.fn(),
};

// Mock the API client packages before importing the service
vi.mock('@recruitiq/api-client', () => ({
  APIClient: vi.fn(() => mockApiClientInstance),
  PaylinqClient: vi.fn(() => mockPaylinqClientInstance),
}));

// Now import the service after mocks are set up
import { compensationService } from '@/features/payroll/services/compensation.service';

describe('compensationService', () => {
  let mockPaylinqClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaylinqClient = mockPaylinqClientInstance;
  });

  describe('getCompensation', () => {
    it('should fetch all compensation records without filters', async () => {
      // Arrange
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: '223e4567-e89b-12d3-a456-426614174001',
          baseSalary: 50000,
          currency: 'USD',
          effectiveDate: '2025-01-01',
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          employeeId: '423e4567-e89b-12d3-a456-426614174003',
          baseSalary: 60000,
          currency: 'USD',
          effectiveDate: '2025-01-01',
        },
      ];
      mockPaylinqClient.getCompensation.mockResolvedValue({ data: mockData });

      // Act
      const result = await compensationService.getCompensation();

      // Assert
      expect(mockPaylinqClient.getCompensation).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });

    it('should fetch compensation with filters', async () => {
      // Arrange
      const filters = { employeeId: '223e4567-e89b-12d3-a456-426614174001' };
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: '223e4567-e89b-12d3-a456-426614174001',
          baseSalary: 50000,
          currency: 'USD',
        },
      ];
      mockPaylinqClient.getCompensation.mockResolvedValue({ data: mockData });

      // Act
      const result = await compensationService.getCompensation(filters);

      // Assert
      expect(mockPaylinqClient.getCompensation).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockData);
      expect(result[0].employeeId).toBe(filters.employeeId);
    });

    it('should handle errors when fetching compensation', async () => {
      // Arrange
      const error = new Error('Failed to fetch compensation');
      mockPaylinqClient.getCompensation.mockRejectedValue(error);

      // Act & Assert
      await expect(compensationService.getCompensation()).rejects.toThrow(
        'Failed to fetch compensation'
      );
    });
  });

  describe('getCompensationById', () => {
    it('should fetch a single compensation record by ID', async () => {
      // Arrange
      const compId = '123e4567-e89b-12d3-a456-426614174000';
      const mockComp = {
        id: compId,
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        baseSalary: 50000,
        currency: 'USD',
        bonuses: [],
        allowances: [],
        effectiveDate: '2025-01-01',
      };
      mockPaylinqClient.getCompensationById.mockResolvedValue({ data: mockComp });

      // Act
      const result = await compensationService.getCompensationById(compId);

      // Assert
      expect(mockPaylinqClient.getCompensationById).toHaveBeenCalledWith(compId);
      expect(result).toEqual(mockComp);
      expect(result.id).toBe(compId);
      expect(result.baseSalary).toBe(50000);
    });

    it('should handle not found error', async () => {
      // Arrange
      const compId = 'nonexistent-id';
      const error = new Error('Compensation not found');
      mockPaylinqClient.getCompensationById.mockRejectedValue(error);

      // Act & Assert
      await expect(compensationService.getCompensationById(compId)).rejects.toThrow(
        'Compensation not found'
      );
    });
  });

  describe('createCompensation', () => {
    it('should create a new compensation record', async () => {
      // Arrange
      const compData = {
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        baseSalary: 55000,
        currency: 'USD',
        effectiveDate: '2025-02-01',
      };
      const mockCreated = {
        id: '523e4567-e89b-12d3-a456-426614174004',
        ...compData,
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.createCompensation.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await compensationService.createCompensation(compData);

      // Assert
      expect(mockPaylinqClient.createCompensation).toHaveBeenCalledWith(compData);
      expect(result).toEqual(mockCreated);
      expect(result.id).toBeDefined();
      expect(result.baseSalary).toBe(55000);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = {
        employeeId: 'invalid-id',
        baseSalary: -1000, // Invalid negative salary
      };
      const error = new Error('Validation failed: baseSalary must be positive');
      mockPaylinqClient.createCompensation.mockRejectedValue(error);

      // Act & Assert
      await expect(compensationService.createCompensation(invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });

    it('should create compensation with bonuses and allowances', async () => {
      // Arrange
      const compData = {
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        baseSalary: 50000,
        currency: 'USD',
        bonuses: [{ type: 'performance', amount: 5000 }],
        allowances: [{ type: 'housing', amount: 10000 }],
      };
      const mockCreated = {
        id: '623e4567-e89b-12d3-a456-426614174005',
        ...compData,
      };
      mockPaylinqClient.createCompensation.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await compensationService.createCompensation(compData);

      // Assert
      expect(result.bonuses).toHaveLength(1);
      expect(result.allowances).toHaveLength(1);
      expect(result.bonuses[0].amount).toBe(5000);
    });
  });

  describe('updateCompensation', () => {
    it('should update an existing compensation record', async () => {
      // Arrange
      const compId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        baseSalary: 60000,
        effectiveDate: '2025-03-01',
      };
      const mockUpdated = {
        id: compId,
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        baseSalary: 60000,
        currency: 'USD',
        effectiveDate: '2025-03-01',
        updatedAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.updateCompensation.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await compensationService.updateCompensation(compId, updates);

      // Assert
      expect(mockPaylinqClient.updateCompensation).toHaveBeenCalledWith(compId, updates);
      expect(result).toEqual(mockUpdated);
      expect(result.baseSalary).toBe(60000);
      expect(result.effectiveDate).toBe('2025-03-01');
    });

    it('should handle errors when updating', async () => {
      // Arrange
      const compId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { baseSalary: -5000 }; // Invalid
      const error = new Error('Invalid salary value');
      mockPaylinqClient.updateCompensation.mockRejectedValue(error);

      // Act & Assert
      await expect(
        compensationService.updateCompensation(compId, updates)
      ).rejects.toThrow('Invalid salary value');
    });
  });

  describe('deleteCompensation', () => {
    it('should delete a compensation record', async () => {
      // Arrange
      const compId = '123e4567-e89b-12d3-a456-426614174000';
      mockPaylinqClient.deleteCompensation.mockResolvedValue(undefined);

      // Act
      await compensationService.deleteCompensation(compId);

      // Assert
      expect(mockPaylinqClient.deleteCompensation).toHaveBeenCalledWith(compId);
    });

    it('should handle errors when deleting', async () => {
      // Arrange
      const compId = 'nonexistent-id';
      const error = new Error('Compensation not found');
      mockPaylinqClient.deleteCompensation.mockRejectedValue(error);

      // Act & Assert
      await expect(compensationService.deleteCompensation(compId)).rejects.toThrow(
        'Compensation not found'
      );
    });
  });

  describe('Service Integration', () => {
    it('should use PaylinqClient for all operations', () => {
      // Verify that the service properly integrates with PaylinqClient
      expect(PaylinqClient).toHaveBeenCalled();
    });
  });
});
