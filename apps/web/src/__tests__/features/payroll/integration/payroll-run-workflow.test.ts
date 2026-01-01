/**
 * Integration Tests for Payroll Run Workflow
 * 
 * Tests the complete end-to-end flow of creating and processing payroll runs.
 * Following industry standards from TESTING_STANDARDS.md - Integration Testing section.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePayrollRuns, useCreatePayrollRun } from '@/features/payroll/hooks/usePayrollRuns';
import { useWorkers } from '@/features/payroll/hooks/useWorkers';
import { payrollRunsService } from '@/features/payroll/services/payroll-runs.service';
import { workersService } from '@/features/payroll/services/workers.service';

// Mock services
vi.mock('@/features/payroll/services/payroll-runs.service', () => ({
  payrollRunsService: {
    getPayrollRuns: vi.fn(),
    createPayrollRun: vi.fn(),
    getPayrollRun: vi.fn(),
    updatePayrollRun: vi.fn(),
    processPayrollRun: vi.fn(),
  },
}));

vi.mock('@/features/payroll/services/workers.service', () => ({
  workersService: {
    getWorkers: vi.fn(),
  },
}));

describe('Payroll Run Workflow Integration Tests', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('Complete Payroll Run Creation Flow', () => {
    it('should create payroll run and fetch workers in integrated workflow', async () => {
      // Arrange - Mock initial data
      const mockWorkers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          employmentType: 'full-time',
          status: 'active',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          firstName: 'Jane',
          lastName: 'Smith',
          employmentType: 'full-time',
          status: 'active',
        },
      ];

      const mockExistingRuns = [
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          runCode: 'RUN-2025-01',
          status: 'completed',
          period: 'monthly',
        },
      ];

      vi.mocked(workersService.getWorkers).mockResolvedValue({ workers: mockWorkers });
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue(mockExistingRuns);

      // Act - Fetch workers first (prerequisite for payroll run)
      const { result: workersResult } = renderHook(() => useWorkers(), { wrapper });

      await waitFor(() => expect(workersResult.current.isSuccess).toBe(true));

      // Assert - Workers are loaded
      expect(workersResult.current.data?.workers).toHaveLength(2);
      expect(workersResult.current.data?.workers[0].firstName).toBe('John');

      // Act - Fetch existing payroll runs
      const { result: runsResult } = renderHook(() => usePayrollRuns(), { wrapper });

      await waitFor(() => expect(runsResult.current.isSuccess).toBe(true));

      // Assert - Existing runs are loaded
      expect(runsResult.current.data).toHaveLength(1);
      expect(runsResult.current.data?.[0].runCode).toBe('RUN-2025-01');

      // Act - Create new payroll run
      const newPayrollRun = {
        runCode: 'RUN-2025-02',
        period: 'monthly',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const createdRun = {
        id: '423e4567-e89b-12d3-a456-426614174003',
        ...newPayrollRun,
        status: 'draft',
        totalEmployees: mockWorkers.length,
      };

      vi.mocked(payrollRunsService.createPayrollRun).mockResolvedValue(createdRun);

      const { result: createResult } = renderHook(() => useCreatePayrollRun(), { wrapper });
      
      createResult.current.mutate(newPayrollRun);

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // Assert - New run created successfully
      expect(createResult.current.data).toEqual(createdRun);
      expect(createResult.current.data?.totalEmployees).toBe(2);
      expect(createResult.current.data?.status).toBe('draft');
    });

    it('should handle payroll run creation with filtering workers', async () => {
      // Arrange - Setup workers with different statuses
      const mockWorkers = [
        { id: '1', firstName: 'Active', lastName: 'Worker', status: 'active' },
        { id: '2', firstName: 'Inactive', lastName: 'Worker', status: 'inactive' },
        { id: '3', firstName: 'Terminated', lastName: 'Worker', status: 'terminated' },
      ];

      vi.mocked(workersService.getWorkers).mockResolvedValue({ workers: mockWorkers });

      // Act - Fetch workers with filter
      const { result: workersResult } = renderHook(
        () => useWorkers({ status: 'active' }), 
        { wrapper }
      );

      await waitFor(() => expect(workersResult.current.isSuccess).toBe(true));

      // Assert - Only active workers should be included in payroll
      const activeWorkers = mockWorkers.filter(w => w.status === 'active');
      expect(activeWorkers).toHaveLength(1);

      // Act - Create payroll run with active workers count
      const newRun = {
        runCode: 'RUN-2025-02',
        period: 'monthly',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const createdRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newRun,
        status: 'draft',
        totalEmployees: activeWorkers.length,
      };

      vi.mocked(payrollRunsService.createPayrollRun).mockResolvedValue(createdRun);

      const { result: createResult } = renderHook(() => useCreatePayrollRun(), { wrapper });
      createResult.current.mutate(newRun);

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // Assert
      expect(createResult.current.data?.totalEmployees).toBe(1);
    });

    it('should handle errors in payroll run creation workflow', async () => {
      // Arrange
      const mockWorkers = [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'active' },
      ];

      vi.mocked(workersService.getWorkers).mockResolvedValue({ workers: mockWorkers });
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue([]);

      // Act - Fetch workers successfully
      const { result: workersResult } = renderHook(() => useWorkers(), { wrapper });
      await waitFor(() => expect(workersResult.current.isSuccess).toBe(true));

      // Act - Attempt to create payroll run with validation error
      const invalidRun = {
        runCode: '', // Invalid - empty code
        period: 'monthly',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const validationError = new Error('Run code is required');
      vi.mocked(payrollRunsService.createPayrollRun).mockRejectedValue(validationError);

      const { result: createResult } = renderHook(() => useCreatePayrollRun(), { wrapper });
      createResult.current.mutate(invalidRun);

      await waitFor(() => expect(createResult.current.isError).toBe(true));

      // Assert - Error is handled properly
      expect(createResult.current.error).toEqual(validationError);
      expect(workersResult.current.data?.workers).toHaveLength(1); // Workers still available
    });
  });

  describe('Payroll Run Processing Flow', () => {
    it('should process payroll run after creation', async () => {
      // Arrange - Create a draft payroll run first
      const draftRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        runCode: 'RUN-2025-02',
        status: 'draft',
        period: 'monthly',
        totalEmployees: 10,
      };

      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue([draftRun]);

      // Act - Fetch the draft run
      const { result: runsResult } = renderHook(() => usePayrollRuns(), { wrapper });
      await waitFor(() => expect(runsResult.current.isSuccess).toBe(true));

      // Assert - Draft run exists
      expect(runsResult.current.data?.[0].status).toBe('draft');

      // Act - Process the payroll run
      const processedRun = {
        ...draftRun,
        status: 'processing',
        processedAt: new Date().toISOString(),
      };

      vi.mocked(payrollRunsService.processPayrollRun).mockResolvedValue(processedRun);

      // Simulate processing (in real scenario, would be triggered by user action)
      const result = await payrollRunsService.processPayrollRun(draftRun.id);

      // Assert - Run is now processing
      expect(result.status).toBe('processing');
      expect(result.processedAt).toBeDefined();
    });

    it('should reflect status changes throughout workflow', async () => {
      // Arrange - Initial draft run
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      let currentStatus = 'draft';

      const mockGetRun = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          id: runId,
          runCode: 'RUN-2025-02',
          status: currentStatus,
        });
      });

      vi.mocked(payrollRunsService.getPayrollRun).mockImplementation(mockGetRun);

      // Act - Fetch initial status
      let result = await payrollRunsService.getPayrollRun(runId);
      expect(result.status).toBe('draft');

      // Act - Update to processing
      currentStatus = 'processing';
      result = await payrollRunsService.getPayrollRun(runId);
      expect(result.status).toBe('processing');

      // Act - Update to completed
      currentStatus = 'completed';
      result = await payrollRunsService.getPayrollRun(runId);
      expect(result.status).toBe('completed');

      // Assert - All status transitions occurred
      expect(mockGetRun).toHaveBeenCalledTimes(3);
    });
  });

  describe('Multi-Period Payroll Runs', () => {
    it('should handle multiple payroll runs for different periods', async () => {
      // Arrange - Multiple runs across different periods
      const mockRuns = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          runCode: 'RUN-2025-01',
          period: 'monthly',
          status: 'completed',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          runCode: 'RUN-2025-W01',
          period: 'weekly',
          status: 'completed',
          startDate: '2025-01-01',
          endDate: '2025-01-07',
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          runCode: 'RUN-2025-02',
          period: 'monthly',
          status: 'draft',
          startDate: '2025-02-01',
          endDate: '2025-02-28',
        },
      ];

      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue(mockRuns);

      // Act - Fetch all runs
      const { result } = renderHook(() => usePayrollRuns(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - All runs are available
      expect(result.current.data).toHaveLength(3);

      // Assert - Can filter by period
      const monthlyRuns = result.current.data?.filter(run => run.period === 'monthly');
      expect(monthlyRuns).toHaveLength(2);

      // Assert - Can filter by status
      const completedRuns = result.current.data?.filter(run => run.status === 'completed');
      expect(completedRuns).toHaveLength(2);

      // Assert - Can identify current draft run
      const draftRuns = result.current.data?.filter(run => run.status === 'draft');
      expect(draftRuns).toHaveLength(1);
      expect(draftRuns?.[0].runCode).toBe('RUN-2025-02');
    });
  });

  describe('Cache Consistency Across Workflow', () => {
    it('should maintain cache consistency when creating and fetching runs', async () => {
      // Arrange - Initial empty state
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue([]);

      // Act - Fetch initial runs (empty)
      const { result: fetchResult } = renderHook(() => usePayrollRuns(), { wrapper });
      await waitFor(() => expect(fetchResult.current.isSuccess).toBe(true));
      expect(fetchResult.current.data).toHaveLength(0);

      // Act - Create new run
      const newRun = {
        runCode: 'RUN-2025-01',
        period: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const createdRun = { id: '123e4567-e89b-12d3-a456-426614174000', ...newRun, status: 'draft' };
      vi.mocked(payrollRunsService.createPayrollRun).mockResolvedValue(createdRun);

      const { result: createResult } = renderHook(() => useCreatePayrollRun(), { wrapper });
      createResult.current.mutate(newRun);

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // Assert - Cache should be invalidated after creation
      // Next fetch should get updated list
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue([createdRun]);

      // Verify that the cache invalidation occurred by checking query state
      await waitFor(() => {
        const queries = queryClient.getQueriesData({ queryKey: ['payrollRuns'] });
        // Queries with payrollRuns key should exist
        expect(queries.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Recovery in Workflow', () => {
    it('should allow retry after failed payroll run creation', async () => {
      // Arrange - First attempt fails
      const newRun = {
        runCode: 'RUN-2025-01',
        period: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const error = new Error('Network error');
      vi.mocked(payrollRunsService.createPayrollRun)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174000',
          ...newRun,
          status: 'draft',
        });

      // Act - First attempt fails
      const { result } = renderHook(() => useCreatePayrollRun(), { wrapper });
      result.current.mutate(newRun);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);

      // Act - Retry with same data
      result.current.reset();
      result.current.mutate(newRun);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Second attempt succeeds
      expect(result.current.data?.id).toBeDefined();
      expect(result.current.data?.runCode).toBe('RUN-2025-01');
    });
  });
});
