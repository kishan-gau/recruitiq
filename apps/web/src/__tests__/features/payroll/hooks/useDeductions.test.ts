/**
 * Tests for useDeductions hook
 * 
 * Tests React Query hooks for deductions data fetching and mutations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useDeductions,
  useDeduction,
  useCreateDeduction,
  useUpdateDeduction,
  useDeleteDeduction,
  useDed,
} from '@/features/payroll/hooks/useDeductions';
import { deductionsService } from '@/features/payroll/services/deductions.service';

// Mock the deductions service
vi.mock('@/features/payroll/services/deductions.service', () => ({
  deductionsService: {
    getDeductions: vi.fn(),
    getDeduction: vi.fn(),
    createDeduction: vi.fn(),
    updateDeduction: vi.fn(),
    deleteDeduction: vi.fn(),
  },
}));

describe('useDeductions hooks', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Create wrapper component
    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('useDeductions - fetching all deductions', () => {
    it('should fetch all deductions successfully', async () => {
      // Arrange
      const mockDeductions = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Health Insurance',
          type: 'pre-tax',
          amount: 200,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: '401k',
          type: 'pre-tax',
          amount: 500,
        },
      ];
      vi.mocked(deductionsService.getDeductions).mockResolvedValue(mockDeductions);

      // Act
      const { result } = renderHook(() => useDeductions(), { wrapper });

      // Assert - Initial state
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Success state
      expect(result.current.data).toEqual(mockDeductions);
      expect(result.current.isLoading).toBe(false);
      expect(deductionsService.getDeductions).toHaveBeenCalledWith(undefined);
    });

    it('should fetch deductions with filters', async () => {
      // Arrange
      const filters = { type: 'pre-tax' };
      const mockDeductions = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Health Insurance',
          type: 'pre-tax',
          amount: 200,
        },
      ];
      vi.mocked(deductionsService.getDeductions).mockResolvedValue(mockDeductions);

      // Act
      const { result } = renderHook(() => useDeductions(filters), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockDeductions);
      expect(deductionsService.getDeductions).toHaveBeenCalledWith(filters);
    });

    it('should handle fetch errors gracefully', async () => {
      // Arrange
      const error = new Error('Failed to fetch deductions');
      vi.mocked(deductionsService.getDeductions).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useDeductions(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array when no deductions exist', async () => {
      // Arrange
      vi.mocked(deductionsService.getDeductions).mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => useDeductions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useDeduction - fetching single deduction', () => {
    it('should fetch a single deduction by ID', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const mockDeduction = {
        id: deductionId,
        name: 'Health Insurance',
        type: 'pre-tax',
        amount: 200,
      };
      vi.mocked(deductionsService.getDeduction).mockResolvedValue(mockDeduction);

      // Act
      const { result } = renderHook(() => useDeduction(deductionId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockDeduction);
      expect(deductionsService.getDeduction).toHaveBeenCalledWith(deductionId);
    });

    it('should not fetch when ID is empty', async () => {
      // Arrange
      const emptyId = '';

      // Act
      const { result } = renderHook(() => useDeduction(emptyId), { wrapper });

      // Assert - Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(deductionsService.getDeduction).not.toHaveBeenCalled();
    });

    it('should handle fetch error for single deduction', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Deduction not found');
      vi.mocked(deductionsService.getDeduction).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useDeduction(deductionId), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateDeduction - mutation', () => {
    it('should create a deduction successfully', async () => {
      // Arrange
      const newDeduction = {
        name: 'Dental Insurance',
        type: 'pre-tax',
        amount: 100,
      };
      const createdDeduction = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        ...newDeduction,
      };
      vi.mocked(deductionsService.createDeduction).mockResolvedValue(createdDeduction);

      // Act
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });

      result.current.mutate(newDeduction);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(createdDeduction);
      expect(deductionsService.createDeduction).toHaveBeenCalled();
      expect(deductionsService.createDeduction.mock.calls[0][0]).toEqual(newDeduction);
    });

    it('should invalidate deductions cache after successful creation', async () => {
      // Arrange
      const newDeduction = { name: 'Vision Insurance', type: 'pre-tax', amount: 50 };
      const createdDeduction = { id: '423e4567-e89b-12d3-a456-426614174003', ...newDeduction };
      vi.mocked(deductionsService.createDeduction).mockResolvedValue(createdDeduction);

      // Pre-populate cache
      queryClient.setQueryData(['deductions'], []);

      // Act
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });
      result.current.mutate(newDeduction);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Cache should be invalidated
      const queryState = queryClient.getQueryState(['deductions']);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const newDeduction = { name: 'Invalid', type: 'pre-tax', amount: -100 };
      const error = new Error('Validation failed');
      vi.mocked(deductionsService.createDeduction).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });
      result.current.mutate(newDeduction);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateDeduction - mutation', () => {
    it('should update a deduction successfully', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { amount: 250 };
      const updatedDeduction = {
        id: deductionId,
        name: 'Health Insurance',
        type: 'pre-tax',
        amount: 250,
      };
      vi.mocked(deductionsService.updateDeduction).mockResolvedValue(updatedDeduction);

      // Act
      const { result } = renderHook(() => useUpdateDeduction(), { wrapper });
      result.current.mutate({ id: deductionId, data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(updatedDeduction);
      expect(deductionsService.updateDeduction).toHaveBeenCalledWith(deductionId, updateData);
    });

    it('should invalidate both list and detail caches after update', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { amount: 300 };
      const updatedDeduction = { id: deductionId, name: 'Test', amount: 300 };
      vi.mocked(deductionsService.updateDeduction).mockResolvedValue(updatedDeduction);

      // Pre-populate caches
      queryClient.setQueryData(['deductions'], []);
      queryClient.setQueryData(['deductions', deductionId], {});

      // Act
      const { result } = renderHook(() => useUpdateDeduction(), { wrapper });
      result.current.mutate({ id: deductionId, data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      const listQueryState = queryClient.getQueryState(['deductions']);
      const detailQueryState = queryClient.getQueryState(['deductions', deductionId]);
      expect(listQueryState?.isInvalidated).toBe(true);
      expect(detailQueryState?.isInvalidated).toBe(true);
    });

    it('should handle update errors', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { amount: -50 };
      const error = new Error('Invalid amount');
      vi.mocked(deductionsService.updateDeduction).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useUpdateDeduction(), { wrapper });
      result.current.mutate({ id: deductionId, data: updateData });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteDeduction - mutation', () => {
    it('should delete a deduction successfully', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(deductionsService.deleteDeduction).mockResolvedValue(undefined);

      // Act
      const { result } = renderHook(() => useDeleteDeduction(), { wrapper });
      result.current.mutate(deductionId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(deductionsService.deleteDeduction).toHaveBeenCalled();
      expect(deductionsService.deleteDeduction.mock.calls[0][0]).toBe(deductionId);
    });

    it('should invalidate deductions cache after deletion', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(deductionsService.deleteDeduction).mockResolvedValue(undefined);

      // Pre-populate cache
      queryClient.setQueryData(['deductions'], [{ id: deductionId }]);

      // Act
      const { result } = renderHook(() => useDeleteDeduction(), { wrapper });
      result.current.mutate(deductionId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      const queryState = queryClient.getQueryState(['deductions']);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const deductionId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Cannot delete deduction in use');
      vi.mocked(deductionsService.deleteDeduction).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useDeleteDeduction(), { wrapper });
      result.current.mutate(deductionId);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDed - combined hook', () => {
    it('should provide all deductions functionality in one hook', async () => {
      // Arrange
      const mockDeductions = [
        { id: '123', name: 'Test Deduction', type: 'pre-tax', amount: 100 },
      ];
      vi.mocked(deductionsService.getDeductions).mockResolvedValue(mockDeductions);

      // Act
      const { result } = renderHook(() => useDed(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingDeductions).toBe(false));

      // Assert - Query data
      expect(result.current.deductions).toEqual(mockDeductions);
      expect(result.current.isLoadingDeductions).toBe(false);
      expect(result.current.isErrorDeductions).toBe(false);

      // Assert - Mutation functions exist
      expect(result.current.createDeduction).toBeDefined();
      expect(result.current.updateDeduction).toBeDefined();
      expect(result.current.deleteDeduction).toBeDefined();
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });

    it('should handle combined hook with filters', async () => {
      // Arrange
      const filters = { type: 'post-tax' };
      const mockDeductions = [
        { id: '123', name: 'Post-tax Deduction', type: 'post-tax', amount: 75 },
      ];
      vi.mocked(deductionsService.getDeductions).mockResolvedValue(mockDeductions);

      // Act
      const { result } = renderHook(() => useDed(filters), { wrapper });

      await waitFor(() => expect(result.current.isLoadingDeductions).toBe(false));

      // Assert
      expect(result.current.deductions).toEqual(mockDeductions);
      expect(deductionsService.getDeductions).toHaveBeenCalledWith(filters);
    });

    it('should expose mutation loading states', async () => {
      // Arrange
      const mockDeductions = [];
      const newDeduction = { name: 'New', type: 'pre-tax', amount: 100 };
      vi.mocked(deductionsService.getDeductions).mockResolvedValue(mockDeductions);
      vi.mocked(deductionsService.createDeduction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: '1', ...newDeduction }), 100))
      );

      // Act
      const { result } = renderHook(() => useDed(), { wrapper });

      await waitFor(() => !result.current.isLoadingDeductions);

      result.current.createDeduction(newDeduction);

      // Assert - Creating state should be true while mutation is pending
      await waitFor(() => expect(result.current.isCreating).toBe(true));
    });
  });

  describe('cache management', () => {
    it('should use correct query key for caching', async () => {
      // Arrange
      const filters = { type: 'pre-tax' };
      vi.mocked(deductionsService.getDeductions).mockResolvedValue([]);

      // Act
      renderHook(() => useDeductions(filters), { wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['deductions', filters]);
        expect(queryState).toBeDefined();
      });
    });

    it('should cache results and not refetch on remount within staleTime', async () => {
      // Arrange
      const mockData = [{ id: '123', name: 'Test', type: 'pre-tax', amount: 100 }];
      vi.mocked(deductionsService.getDeductions).mockResolvedValue(mockData);

      // Create a query client with longer staleTime to ensure cache is used
      const cacheQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 10000, // 10 seconds
          },
        },
      });

      const cacheWrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: cacheQueryClient }, children)
      );

      // Act - First mount
      const { unmount } = renderHook(() => useDeductions(), { wrapper: cacheWrapper });
      await waitFor(() =>
        expect(deductionsService.getDeductions).toHaveBeenCalledTimes(1)
      );

      // Unmount and remount
      unmount();
      renderHook(() => useDeductions(), { wrapper: cacheWrapper });

      // Assert - Should use cache, not refetch (within staleTime)
      await waitFor(() => {
        // Still only called once from first mount
        expect(deductionsService.getDeductions).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error: timeout');
      vi.mocked(deductionsService.getDeductions).mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() => useDeductions(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(networkError);
      expect(result.current.error?.message).toContain('Network error');
    });

    it('should handle authorization errors', async () => {
      // Arrange
      const authError = new Error('Unauthorized: Invalid token');
      vi.mocked(deductionsService.getDeductions).mockRejectedValue(authError);

      // Act
      const { result } = renderHook(() => useDeductions(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error?.message).toContain('Unauthorized');
    });
  });
});
