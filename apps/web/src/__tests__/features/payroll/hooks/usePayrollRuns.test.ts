/**
 * Tests for usePayrollRuns hook
 * 
 * Tests React Query hooks for payroll runs data fetching and mutations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePayrollRuns,
  usePayrollRun,
  useCreatePayrollRun,
  useUpdatePayrollRun,
  useExecutePayrollRun,
} from '@/features/payroll/hooks/usePayrollRuns';
import { payrollRunsService } from '@/features/payroll/services/payroll-runs.service';

// Mock the payroll runs service
vi.mock('@/features/payroll/services/payroll-runs.service', () => ({
  payrollRunsService: {
    getPayrollRuns: vi.fn(),
    getPayrollRun: vi.fn(),
    createPayrollRun: vi.fn(),
    updatePayrollRun: vi.fn(),
    processPayrollRun: vi.fn(),
  },
}));

describe('usePayrollRuns hooks', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for tests
        },
      },
    });

    // Create wrapper component with QueryClientProvider
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('usePayrollRuns', () => {
    it('should fetch payroll runs successfully', async () => {
      // Arrange
      const mockRuns = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          runCode: 'RUN-001',
          status: 'pending',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          runCode: 'RUN-002',
          status: 'completed',
        },
      ];
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue(mockRuns);

      // Act
      const { result } = renderHook(() => usePayrollRuns(), { wrapper });

      // Assert - Initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Wait for the query to resolve
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Success state
      expect(result.current.data).toEqual(mockRuns);
      expect(result.current.isLoading).toBe(false);
      expect(payrollRunsService.getPayrollRuns).toHaveBeenCalledWith(undefined);
    });

    it('should fetch payroll runs with filters', async () => {
      // Arrange
      const filters = { status: 'completed', period: 'monthly' };
      const mockRuns = [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          runCode: 'RUN-002',
          status: 'completed',
          period: 'monthly',
        },
      ];
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue(mockRuns);

      // Act
      const { result } = renderHook(() => usePayrollRuns(filters), { wrapper });

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockRuns);
      expect(payrollRunsService.getPayrollRuns).toHaveBeenCalledWith(filters);
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const error = new Error('Failed to fetch payroll runs');
      vi.mocked(payrollRunsService.getPayrollRuns).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => usePayrollRuns(), { wrapper });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should use correct query key', async () => {
      // Arrange
      const filters = { status: 'pending' };
      vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue([]);

      // Act
      renderHook(() => usePayrollRuns(filters), { wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['payrollRuns', filters]);
        expect(queryState).toBeDefined();
      });
    });
  });

  describe('usePayrollRun', () => {
    it('should fetch a single payroll run by ID', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockRun = {
        id: runId,
        runCode: 'RUN-001',
        status: 'pending',
        period: 'monthly',
      };
      vi.mocked(payrollRunsService.getPayrollRun).mockResolvedValue(mockRun);

      // Act
      const { result } = renderHook(() => usePayrollRun(runId), { wrapper });

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockRun);
      expect(payrollRunsService.getPayrollRun).toHaveBeenCalledWith(runId);
    });

    it('should not fetch when ID is undefined', async () => {
      // Act
      const { result } = renderHook(() => usePayrollRun(undefined), { wrapper });

      // Assert
      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(payrollRunsService.getPayrollRun).not.toHaveBeenCalled();
    });

    it('should handle fetch errors for single run', async () => {
      // Arrange
      const runId = 'nonexistent-id';
      const error = new Error('Payroll run not found');
      vi.mocked(payrollRunsService.getPayrollRun).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => usePayrollRun(runId), { wrapper });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreatePayrollRun', () => {
    it('should create a payroll run and invalidate queries', async () => {
      // Arrange
      const newRun = {
        runCode: 'RUN-003',
        period: 'monthly',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };
      const createdRun = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        ...newRun,
        status: 'draft',
      };
      vi.mocked(payrollRunsService.createPayrollRun).mockResolvedValue(createdRun);

      // Act
      const { result } = renderHook(() => useCreatePayrollRun(), { wrapper });

      // Trigger mutation
      result.current.mutate(newRun);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(createdRun);
      expect(payrollRunsService.createPayrollRun).toHaveBeenCalledWith(newRun);
    });

    it('should invalidate payroll runs queries on success', async () => {
      // Arrange
      const newRun = { runCode: 'RUN-004' };
      vi.mocked(payrollRunsService.createPayrollRun).mockResolvedValue({
        id: '423e4567-e89b-12d3-a456-426614174003',
        ...newRun,
      });

      // Populate query cache
      queryClient.setQueryData(['payrollRuns'], []);

      // Act
      const { result } = renderHook(() => useCreatePayrollRun(), { wrapper });
      result.current.mutate(newRun);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Query should be invalidated
      const queryState = queryClient.getQueryState(['payrollRuns']);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const newRun = { runCode: '' }; // Invalid
      const error = new Error('Validation failed');
      vi.mocked(payrollRunsService.createPayrollRun).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreatePayrollRun(), { wrapper });
      result.current.mutate(newRun);

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdatePayrollRun', () => {
    it('should update a payroll run and invalidate queries', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { status: 'in_progress' };
      const updatedRun = {
        id: runId,
        runCode: 'RUN-001',
        status: 'in_progress',
      };
      vi.mocked(payrollRunsService.updatePayrollRun).mockResolvedValue(updatedRun);

      // Act
      const { result } = renderHook(() => useUpdatePayrollRun(), { wrapper });
      result.current.mutate({ id: runId, updates });

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(updatedRun);
      expect(payrollRunsService.updatePayrollRun).toHaveBeenCalledWith(runId, updates);
    });

    it('should invalidate both list and single run queries', async () => {
      // Arrange
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { status: 'completed' };
      vi.mocked(payrollRunsService.updatePayrollRun).mockResolvedValue({
        id: runId,
        ...updates,
      });

      // Populate query cache
      queryClient.setQueryData(['payrollRuns'], []);
      queryClient.setQueryData(['payrollRuns', runId], {});

      // Act
      const { result } = renderHook(() => useUpdatePayrollRun(), { wrapper });
      result.current.mutate({ id: runId, updates });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Both queries should be invalidated
      expect(queryClient.getQueryState(['payrollRuns'])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(['payrollRuns', runId])?.isInvalidated).toBe(true);
    });
  });

  describe('useExecutePayrollRun', () => {
    it('should execute a payroll run', async () => {
      // Arrange
      const processData = {
        runId: '123e4567-e89b-12d3-a456-426614174000',
        approvalNotes: 'Approved',
      };
      const processedRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'processed',
      };
      vi.mocked(payrollRunsService.processPayrollRun).mockResolvedValue(processedRun);

      // Act
      const { result } = renderHook(() => useExecutePayrollRun(), { wrapper });
      result.current.mutate(processData);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(processedRun);
      expect(payrollRunsService.processPayrollRun).toHaveBeenCalledWith(processData);
    });

    it('should handle processing errors', async () => {
      // Arrange
      const processData = { runId: '123e4567-e89b-12d3-a456-426614174000' };
      const error = new Error('Processing failed');
      vi.mocked(payrollRunsService.processPayrollRun).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useExecutePayrollRun(), { wrapper });
      result.current.mutate(processData);

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });
});
