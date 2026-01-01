/**
 * Tests for deductions.service.ts
 * 
 * Tests the service layer for deductions management operations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaylinqClient, APIClient } from '@recruitiq/api-client';
import { deductionsService } from '@/features/payroll/services/deductions.service';

// Mock the API client packages
vi.mock('@recruitiq/api-client', () => ({
  APIClient: vi.fn().mockImplementation(() => ({})),
  PaylinqClient: vi.fn().mockImplementation(() => ({
    getDeductions: vi.fn(),
    getDeduction: vi.fn(),
    createDeduction: vi.fn(),
    updateDeduction: vi.fn(),
    deleteDeduction: vi.fn(),
  })),
}));

describe('deductionsService', () => {
  let mockPaylinqClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const PaylinqClientConstructor = vi.mocked(PaylinqClient);
    mockPaylinqClient = PaylinqClientConstructor.mock.results[0]?.value;
  });

  describe('getDeductions', () => {
    it('should fetch all deductions without filters', async () => {
      // Arrange
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: '223e4567-e89b-12d3-a456-426614174001',
          deductionType: 'tax',
          amount: 5000,
          isPercentage: false,
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          employeeId: '423e4567-e89b-12d3-a456-426614174003',
          deductionType: 'insurance',
          amount: 200,
          isPercentage: false,
        },
      ];
      mockPaylinqClient.getDeductions.mockResolvedValue({ data: mockData });

      // Act
      const result = await deductionsService.getDeductions();

      // Assert
      expect(mockPaylinqClient.getDeductions).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });

    it('should fetch deductions with employee filter', async () => {
      // Arrange
      const employeeId = '223e4567-e89b-12d3-a456-426614174001';
      const filters = { employeeId };
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId,
          deductionType: 'tax',
          amount: 5000,
        },
      ];
      mockPaylinqClient.getDeductions.mockResolvedValue({ data: mockData });

      // Act
      const result = await deductionsService.getDeductions(filters);

      // Assert
      expect(mockPaylinqClient.getDeductions).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockData);
      expect(result[0].employeeId).toBe(employeeId);
    });

    it('should fetch deductions with type filter', async () => {
      // Arrange
      const filters = { deductionType: 'insurance' };
      const mockData = [
        {
          id: '523e4567-e89b-12d3-a456-426614174004',
          deductionType: 'insurance',
          amount: 200,
        },
      ];
      mockPaylinqClient.getDeductions.mockResolvedValue({ data: mockData });

      // Act
      const result = await deductionsService.getDeductions(filters);

      // Assert
      expect(result[0].deductionType).toBe('insurance');
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const error = new Error('Failed to fetch deductions');
      mockPaylinqClient.getDeductions.mockRejectedValue(error);

      // Act & Assert
      await expect(deductionsService.getDeductions()).rejects.toThrow(
        'Failed to fetch deductions'
      );
    });
  });

  describe('getDeduction', () => {
    it('should fetch a single deduction by ID', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const mockDeduction = {
        id: deductionId,
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        deductionType: 'tax',
        amount: 5000,
        percentage: null,
        isPercentage: false,
        description: 'Federal income tax',
        effectiveDate: '2025-01-01',
      };
      mockPaylinqClient.getDeduction.mockResolvedValue({ data: mockDeduction });

      // Act
      const result = await deductionsService.getDeduction(deductionId);

      // Assert
      expect(mockPaylinqClient.getDeduction).toHaveBeenCalledWith(deductionId);
      expect(result).toEqual(mockDeduction);
      expect(result.id).toBe(deductionId);
      expect(result.deductionType).toBe('tax');
    });

    it('should handle not found error', async () => {
      // Arrange
      const deductionId = 'nonexistent-id';
      const error = new Error('Deduction not found');
      mockPaylinqClient.getDeduction.mockRejectedValue(error);

      // Act & Assert
      await expect(deductionsService.getDeduction(deductionId)).rejects.toThrow(
        'Deduction not found'
      );
    });
  });

  describe('createDeduction', () => {
    it('should create a fixed amount deduction', async () => {
      // Arrange
      const deductionData = {
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        deductionType: 'tax',
        amount: 5000,
        isPercentage: false,
        effectiveDate: '2025-01-01',
        description: 'Federal income tax',
      };
      const mockCreated = {
        id: '623e4567-e89b-12d3-a456-426614174005',
        ...deductionData,
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.createDeduction.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await deductionsService.createDeduction(deductionData);

      // Assert
      expect(mockPaylinqClient.createDeduction).toHaveBeenCalledWith(deductionData);
      expect(result).toEqual(mockCreated);
      expect(result.id).toBeDefined();
      expect(result.amount).toBe(5000);
      expect(result.isPercentage).toBe(false);
    });

    it('should create a percentage-based deduction', async () => {
      // Arrange
      const deductionData = {
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        deductionType: 'insurance',
        percentage: 10,
        isPercentage: true,
        effectiveDate: '2025-01-01',
      };
      const mockCreated = {
        id: '723e4567-e89b-12d3-a456-426614174006',
        ...deductionData,
      };
      mockPaylinqClient.createDeduction.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await deductionsService.createDeduction(deductionData);

      // Assert
      expect(result.percentage).toBe(10);
      expect(result.isPercentage).toBe(true);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = {
        employeeId: 'invalid-id',
        deductionType: 'unknown',
        amount: -1000, // Invalid negative amount
      };
      const error = new Error('Validation failed: amount must be positive');
      mockPaylinqClient.createDeduction.mockRejectedValue(error);

      // Act & Assert
      await expect(deductionsService.createDeduction(invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });
  });

  describe('updateDeduction', () => {
    it('should update an existing deduction', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        amount: 6000,
        description: 'Updated tax deduction',
      };
      const mockUpdated = {
        id: deductionId,
        employeeId: '223e4567-e89b-12d3-a456-426614174001',
        deductionType: 'tax',
        amount: 6000,
        description: 'Updated tax deduction',
        updatedAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.updateDeduction.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await deductionsService.updateDeduction(deductionId, updates);

      // Assert
      expect(mockPaylinqClient.updateDeduction).toHaveBeenCalledWith(deductionId, updates);
      expect(result).toEqual(mockUpdated);
      expect(result.amount).toBe(6000);
      expect(result.description).toBe('Updated tax deduction');
    });

    it('should convert fixed to percentage-based deduction', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        percentage: 15,
        isPercentage: true,
        amount: null,
      };
      const mockUpdated = {
        id: deductionId,
        percentage: 15,
        isPercentage: true,
        amount: null,
      };
      mockPaylinqClient.updateDeduction.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await deductionsService.updateDeduction(deductionId, updates);

      // Assert
      expect(result.isPercentage).toBe(true);
      expect(result.percentage).toBe(15);
      expect(result.amount).toBeNull();
    });

    it('should handle errors when updating', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { amount: -5000 }; // Invalid
      const error = new Error('Invalid amount value');
      mockPaylinqClient.updateDeduction.mockRejectedValue(error);

      // Act & Assert
      await expect(
        deductionsService.updateDeduction(deductionId, updates)
      ).rejects.toThrow('Invalid amount value');
    });
  });

  describe('deleteDeduction', () => {
    it('should delete a deduction', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      mockPaylinqClient.deleteDeduction.mockResolvedValue(undefined);

      // Act
      await deductionsService.deleteDeduction(deductionId);

      // Assert
      expect(mockPaylinqClient.deleteDeduction).toHaveBeenCalledWith(deductionId);
    });

    it('should handle errors when deleting', async () => {
      // Arrange
      const deductionId = 'nonexistent-id';
      const error = new Error('Deduction not found');
      mockPaylinqClient.deleteDeduction.mockRejectedValue(error);

      // Act & Assert
      await expect(deductionsService.deleteDeduction(deductionId)).rejects.toThrow(
        'Deduction not found'
      );
    });

    it('should handle delete permission errors', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Insufficient permissions to delete deduction');
      mockPaylinqClient.deleteDeduction.mockRejectedValue(error);

      // Act & Assert
      await expect(deductionsService.deleteDeduction(deductionId)).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  });

  describe('Service Integration', () => {
    it('should use PaylinqClient for all operations', () => {
      // Verify that the service properly integrates with PaylinqClient
      expect(PaylinqClient).toHaveBeenCalled();
    });

    it('should return unwrapped data from API responses', async () => {
      // Arrange
      const mockData = [{ id: '123', deductionType: 'tax' }];
      mockPaylinqClient.getDeductions.mockResolvedValue({ data: mockData });

      // Act
      const result = await deductionsService.getDeductions();

      // Assert - Should return the data property, not the whole response
      expect(result).toEqual(mockData);
      expect(result).not.toHaveProperty('data');
    });
  });
});
