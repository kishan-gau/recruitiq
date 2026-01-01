/**
 * Tests for payroll-runs.service.ts
 * 
 * Tests the service layer that wraps the PaylinqClient for payroll runs operations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaylinqClient, APIClient } from '@recruitiq/api-client';
import { payrollRunsService } from '@/features/payroll/services/payroll-runs.service';

// Mock the API client packages
vi.mock('@recruitiq/api-client', () => ({
  APIClient: vi.fn().mockImplementation(() => ({})),
  PaylinqClient: vi.fn().mockImplementation(() => ({
    getPayrollRuns: vi.fn(),
    getPayrollRun: vi.fn(),
    createPayrollRun: vi.fn(),
    updatePayrollRun: vi.fn(),
    processPayrollRun: vi.fn(),
  })),
}));

describe('payrollRunsService', () => {
  let mockPaylinqClient: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Get the mocked PaylinqClient instance
    const PaylinqClientConstructor = vi.mocked(PaylinqClient);
    mockPaylinqClient = PaylinqClientConstructor.mock.results[0]?.value;
  });

  describe('getPayrollRuns', () => {
    it('should fetch payroll runs without filters', async () => {
      // Arrange
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          runCode: 'RUN-001',
          status: 'pending',
          period: 'monthly',
        },
      ];
      mockPaylinqClient.getPayrollRuns.mockResolvedValue({ data: mockData });

      // Act
      const result = await payrollRunsService.getPayrollRuns();

      // Assert
      expect(mockPaylinqClient.getPayrollRuns).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockData);
    });

    it('should fetch payroll runs with filters', async () => {
      // Arrange
      const filters = { status: 'completed', period: 'monthly' };
      const mockData = [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          runCode: 'RUN-002',
          status: 'completed',
          period: 'monthly',
        },
      ];
      mockPaylinqClient.getPayrollRuns.mockResolvedValue({ data: mockData });

      // Act
      const result = await payrollRunsService.getPayrollRuns(filters);

      // Assert
      expect(mockPaylinqClient.getPayrollRuns).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockData);
    });

    it('should handle errors when fetching payroll runs', async () => {
      // Arrange
      const error = new Error('Network error');
      mockPaylinqClient.getPayrollRuns.mockRejectedValue(error);

      // Act & Assert
      await expect(payrollRunsService.getPayrollRuns()).rejects.toThrow('Network error');
      expect(mockPaylinqClient.getPayrollRuns).toHaveBeenCalled();
    });
  });

  describe('getPayrollRun', () => {
    it('should fetch a single payroll run by ID', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockRun = {
        id: runId,
        runCode: 'RUN-001',
        status: 'pending',
        period: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };
      mockPaylinqClient.getPayrollRun.mockResolvedValue(mockRun);

      // Act
      const result = await payrollRunsService.getPayrollRun(runId);

      // Assert
      expect(mockPaylinqClient.getPayrollRun).toHaveBeenCalledWith(runId);
      expect(result).toEqual(mockRun);
      expect(result.id).toBe(runId);
      expect(result.runCode).toBe('RUN-001');
    });

    it('should handle errors when fetching a single payroll run', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Payroll run not found');
      mockPaylinqClient.getPayrollRun.mockRejectedValue(error);

      // Act & Assert
      await expect(payrollRunsService.getPayrollRun(runId)).rejects.toThrow(
        'Payroll run not found'
      );
      expect(mockPaylinqClient.getPayrollRun).toHaveBeenCalledWith(runId);
    });
  });

  describe('createPayrollRun', () => {
    it('should create a new payroll run', async () => {
      // Arrange
      const runData = {
        runCode: 'RUN-003',
        period: 'monthly',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };
      const mockCreatedRun = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        ...runData,
        status: 'draft',
      };
      mockPaylinqClient.createPayrollRun.mockResolvedValue({ data: mockCreatedRun });

      // Act
      const result = await payrollRunsService.createPayrollRun(runData);

      // Assert
      expect(mockPaylinqClient.createPayrollRun).toHaveBeenCalledWith(runData);
      expect(result).toEqual(mockCreatedRun);
      expect(result.id).toBeDefined();
      expect(result.status).toBe('draft');
    });

    it('should handle validation errors when creating payroll run', async () => {
      // Arrange
      const invalidData = { runCode: '' }; // Missing required fields
      const error = new Error('Validation failed');
      mockPaylinqClient.createPayrollRun.mockRejectedValue(error);

      // Act & Assert
      await expect(payrollRunsService.createPayrollRun(invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });
  });

  describe('updatePayrollRun', () => {
    it('should update an existing payroll run', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        status: 'in_progress',
        notes: 'Updated notes',
      };
      const mockUpdatedRun = {
        id: runId,
        runCode: 'RUN-001',
        status: 'in_progress',
        notes: 'Updated notes',
      };
      mockPaylinqClient.updatePayrollRun.mockResolvedValue({ data: mockUpdatedRun });

      // Act
      const result = await payrollRunsService.updatePayrollRun(runId, updates);

      // Assert
      expect(mockPaylinqClient.updatePayrollRun).toHaveBeenCalledWith(runId, updates);
      expect(result).toEqual(mockUpdatedRun);
      expect(result.status).toBe('in_progress');
      expect(result.notes).toBe('Updated notes');
    });

    it('should handle errors when updating payroll run', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { status: 'invalid_status' };
      const error = new Error('Invalid status');
      mockPaylinqClient.updatePayrollRun.mockRejectedValue(error);

      // Act & Assert
      await expect(payrollRunsService.updatePayrollRun(runId, updates)).rejects.toThrow(
        'Invalid status'
      );
    });
  });

  describe('processPayrollRun', () => {
    it('should process/execute a payroll run', async () => {
      // Arrange
      const processData = {
        runId: '123e4567-e89b-12d3-a456-426614174000',
        approvalNotes: 'Approved for processing',
      };
      const mockProcessedRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        runCode: 'RUN-001',
        status: 'processed',
        processedAt: '2025-01-15T10:00:00Z',
      };
      mockPaylinqClient.processPayrollRun.mockResolvedValue(mockProcessedRun);

      // Act
      const result = await payrollRunsService.processPayrollRun(processData);

      // Assert
      expect(mockPaylinqClient.processPayrollRun).toHaveBeenCalledWith(processData);
      expect(result).toEqual(mockProcessedRun);
      expect(result.status).toBe('processed');
      expect(result.processedAt).toBeDefined();
    });

    it('should handle errors when processing payroll run', async () => {
      // Arrange
      const processData = { runId: '123e4567-e89b-12d3-a456-426614174000' };
      const error = new Error('Processing failed: insufficient data');
      mockPaylinqClient.processPayrollRun.mockRejectedValue(error);

      // Act & Assert
      await expect(payrollRunsService.processPayrollRun(processData)).rejects.toThrow(
        'Processing failed: insufficient data'
      );
    });
  });

  describe('Service Integration', () => {
    it('should maintain singleton instance of clients', () => {
      // This test verifies that the service uses singleton client instances
      // The APIClient and PaylinqClient should be instantiated once
      expect(APIClient).toHaveBeenCalledTimes(1);
      expect(PaylinqClient).toHaveBeenCalledTimes(1);
    });

    it('should pass APIClient instance to PaylinqClient', () => {
      // Verify that PaylinqClient receives an APIClient instance
      const apiClientInstance = vi.mocked(APIClient).mock.results[0]?.value;
      expect(PaylinqClient).toHaveBeenCalledWith(apiClientInstance);
    });
  });
});
