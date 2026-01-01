/**
 * Tests for tax.service.ts
 * 
 * Tests the service layer for tax rules management operations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock instances that will be used by the service
const mockApiClientInstance = {};
const mockPaylinqClientInstance = {
  getTaxRules: vi.fn(),
  getTaxRule: vi.fn(),
  createTaxRule: vi.fn(),
  updateTaxRule: vi.fn(),
  deleteTaxRule: vi.fn(),
};

// Mock the API client packages before importing the service
vi.mock('@recruitiq/api-client', () => ({
  APIClient: vi.fn(() => mockApiClientInstance),
  PaylinqClient: vi.fn(() => mockPaylinqClientInstance),
}));

// Now import the service after mocks are set up
import { taxService } from '@/features/payroll/services/tax.service';

describe('taxService', () => {
  let mockPaylinqClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaylinqClient = mockPaylinqClientInstance;
  });

  describe('getTaxRules', () => {
    it('should fetch all tax rules without filters', async () => {
      // Arrange
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ruleName: 'Federal Income Tax',
          taxType: 'federal',
          rate: 22,
          isActive: true,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          ruleName: 'State Income Tax',
          taxType: 'state',
          rate: 5,
          isActive: true,
        },
      ];
      mockPaylinqClient.getTaxRules.mockResolvedValue({ data: mockData });

      // Act
      const result = await taxService.getTaxRules();

      // Assert
      expect(mockPaylinqClient.getTaxRules).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });

    it('should fetch tax rules with tax type filter', async () => {
      // Arrange
      const filters = { taxType: 'federal' };
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ruleName: 'Federal Income Tax',
          taxType: 'federal',
          rate: 22,
        },
      ];
      mockPaylinqClient.getTaxRules.mockResolvedValue({ data: mockData });

      // Act
      const result = await taxService.getTaxRules(filters);

      // Assert
      expect(mockPaylinqClient.getTaxRules).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockData);
      expect(result[0].taxType).toBe('federal');
    });

    it('should fetch only active tax rules', async () => {
      // Arrange
      const filters = { isActive: true };
      const mockData = [
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          ruleName: 'Active Tax Rule',
          isActive: true,
        },
      ];
      mockPaylinqClient.getTaxRules.mockResolvedValue({ data: mockData });

      // Act
      const result = await taxService.getTaxRules(filters);

      // Assert
      expect(result.every((rule: any) => rule.isActive)).toBe(true);
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const error = new Error('Failed to fetch tax rules');
      mockPaylinqClient.getTaxRules.mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.getTaxRules()).rejects.toThrow('Failed to fetch tax rules');
    });
  });

  describe('getTaxRule', () => {
    it('should fetch a single tax rule by ID', async () => {
      // Arrange
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';
      const mockRule = {
        id: ruleId,
        ruleName: 'Federal Income Tax',
        taxType: 'federal',
        rate: 22,
        minIncome: 0,
        maxIncome: null,
        isActive: true,
        effectiveDate: '2025-01-01',
        description: 'Federal tax on income',
      };
      mockPaylinqClient.getTaxRule.mockResolvedValue({ data: mockRule });

      // Act
      const result = await taxService.getTaxRule(ruleId);

      // Assert
      expect(mockPaylinqClient.getTaxRule).toHaveBeenCalledWith(ruleId);
      expect(result).toEqual(mockRule);
      expect(result.id).toBe(ruleId);
      expect(result.ruleName).toBe('Federal Income Tax');
    });

    it('should handle not found error', async () => {
      // Arrange
      const ruleId = 'nonexistent-id';
      const error = new Error('Tax rule not found');
      mockPaylinqClient.getTaxRule.mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.getTaxRule(ruleId)).rejects.toThrow('Tax rule not found');
    });
  });

  describe('createTaxRule', () => {
    it('should create a simple tax rule', async () => {
      // Arrange
      const ruleData = {
        ruleName: 'Social Security Tax',
        taxType: 'payroll',
        rate: 6.2,
        isActive: true,
        effectiveDate: '2025-01-01',
      };
      const mockCreated = {
        id: '423e4567-e89b-12d3-a456-426614174003',
        ...ruleData,
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.createTaxRule.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await taxService.createTaxRule(ruleData);

      // Assert
      expect(mockPaylinqClient.createTaxRule).toHaveBeenCalledWith(ruleData);
      expect(result).toEqual(mockCreated);
      expect(result.id).toBeDefined();
      expect(result.rate).toBe(6.2);
    });

    it('should create a bracket-based tax rule', async () => {
      // Arrange
      const ruleData = {
        ruleName: 'Progressive Income Tax',
        taxType: 'federal',
        rate: 22,
        minIncome: 50000,
        maxIncome: 100000,
        isActive: true,
      };
      const mockCreated = {
        id: '523e4567-e89b-12d3-a456-426614174004',
        ...ruleData,
      };
      mockPaylinqClient.createTaxRule.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await taxService.createTaxRule(ruleData);

      // Assert
      expect(result.minIncome).toBe(50000);
      expect(result.maxIncome).toBe(100000);
      expect(result.rate).toBe(22);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = {
        ruleName: '',
        taxType: 'invalid-type',
        rate: -5, // Invalid negative rate
      };
      const error = new Error('Validation failed: rate must be positive');
      mockPaylinqClient.createTaxRule.mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.createTaxRule(invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });

    it('should create tax rule with complex brackets', async () => {
      // Arrange
      const ruleData = {
        ruleName: 'Multi-Bracket Tax',
        taxType: 'federal',
        brackets: [
          { minIncome: 0, maxIncome: 25000, rate: 10 },
          { minIncome: 25001, maxIncome: 50000, rate: 15 },
          { minIncome: 50001, maxIncome: null, rate: 22 },
        ],
      };
      const mockCreated = {
        id: '623e4567-e89b-12d3-a456-426614174005',
        ...ruleData,
      };
      mockPaylinqClient.createTaxRule.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await taxService.createTaxRule(ruleData);

      // Assert
      expect(result.brackets).toHaveLength(3);
      expect(result.brackets[0].rate).toBe(10);
    });
  });

  describe('updateTaxRule', () => {
    it('should update an existing tax rule', async () => {
      // Arrange
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        rate: 24,
        effectiveDate: '2025-02-01',
      };
      const mockUpdated = {
        id: ruleId,
        ruleName: 'Federal Income Tax',
        taxType: 'federal',
        rate: 24,
        effectiveDate: '2025-02-01',
        updatedAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.updateTaxRule.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await taxService.updateTaxRule(ruleId, updates);

      // Assert
      expect(mockPaylinqClient.updateTaxRule).toHaveBeenCalledWith(ruleId, updates);
      expect(result).toEqual(mockUpdated);
      expect(result.rate).toBe(24);
      expect(result.effectiveDate).toBe('2025-02-01');
    });

    it('should deactivate a tax rule', async () => {
      // Arrange
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        isActive: false,
        deactivatedAt: '2025-01-15T10:00:00Z',
      };
      const mockUpdated = {
        id: ruleId,
        isActive: false,
        deactivatedAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.updateTaxRule.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await taxService.updateTaxRule(ruleId, updates);

      // Assert
      expect(result.isActive).toBe(false);
      expect(result.deactivatedAt).toBeDefined();
    });

    it('should handle errors when updating', async () => {
      // Arrange
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { rate: -10 }; // Invalid
      const error = new Error('Invalid rate value');
      mockPaylinqClient.updateTaxRule.mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.updateTaxRule(ruleId, updates)).rejects.toThrow(
        'Invalid rate value'
      );
    });
  });

  describe('deleteTaxRule', () => {
    it('should delete a tax rule', async () => {
      // Arrange
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';
      mockPaylinqClient.deleteTaxRule.mockResolvedValue(undefined);

      // Act
      await taxService.deleteTaxRule(ruleId);

      // Assert
      expect(mockPaylinqClient.deleteTaxRule).toHaveBeenCalledWith(ruleId);
    });

    it('should handle errors when deleting', async () => {
      // Arrange
      const ruleId = 'nonexistent-id';
      const error = new Error('Tax rule not found');
      mockPaylinqClient.deleteTaxRule.mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.deleteTaxRule(ruleId)).rejects.toThrow(
        'Tax rule not found'
      );
    });

    it('should handle delete of rule in use error', async () => {
      // Arrange
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Cannot delete tax rule: currently in use');
      mockPaylinqClient.deleteTaxRule.mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.deleteTaxRule(ruleId)).rejects.toThrow(
        'currently in use'
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
      const mockData = [{ id: '123', ruleName: 'Test Rule' }];
      mockPaylinqClient.getTaxRules.mockResolvedValue({ data: mockData });

      // Act
      const result = await taxService.getTaxRules();

      // Assert - Should return the data property, not the whole response
      expect(result).toEqual(mockData);
      expect(result).not.toHaveProperty('data');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tax rules list', async () => {
      // Arrange
      mockPaylinqClient.getTaxRules.mockResolvedValue({ data: [] });

      // Act
      const result = await taxService.getTaxRules();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle tax rule with no max income (unlimited)', async () => {
      // Arrange
      const ruleData = {
        ruleName: 'Unlimited Bracket',
        minIncome: 100000,
        maxIncome: null, // No upper limit
        rate: 37,
      };
      const mockCreated = {
        id: '723e4567-e89b-12d3-a456-426614174006',
        ...ruleData,
      };
      mockPaylinqClient.createTaxRule.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await taxService.createTaxRule(ruleData);

      // Assert
      expect(result.maxIncome).toBeNull();
      expect(result.minIncome).toBe(100000);
    });

    it('should handle tax rule with 0% rate', async () => {
      // Arrange
      const ruleData = {
        ruleName: 'Tax Exempt',
        rate: 0,
        minIncome: 0,
        maxIncome: 10000,
      };
      const mockCreated = {
        id: '823e4567-e89b-12d3-a456-426614174007',
        ...ruleData,
      };
      mockPaylinqClient.createTaxRule.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await taxService.createTaxRule(ruleData);

      // Assert
      expect(result.rate).toBe(0);
    });
  });
});
