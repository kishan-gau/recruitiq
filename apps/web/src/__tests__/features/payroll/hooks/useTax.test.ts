/**
 * Tests for useTax hook
 * 
 * Tests React Query hooks for tax rules data fetching and mutations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useTaxRules,
  useTaxRule,
  useCreateTaxRule,
  useUpdateTaxRule,
  useDeleteTaxRule,
  useTax,
} from '@/features/payroll/hooks/useTax';
import { taxService } from '@/features/payroll/services/tax.service';

// Mock the tax service
vi.mock('@/features/payroll/services/tax.service', () => ({
  taxService: {
    getTaxRules: vi.fn(),
    getTaxRule: vi.fn(),
    createTaxRule: vi.fn(),
    updateTaxRule: vi.fn(),
    deleteTaxRule: vi.fn(),
  },
}));

describe('useTax hooks', () => {
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

  describe('useTaxRules - fetching all tax rules', () => {
    it('should fetch all tax rules successfully', async () => {
      // Arrange
      const mockTaxRules = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Federal Income Tax',
          type: 'federal',
          rate: 0.22,
          applicableThreshold: 40000,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: 'State Tax',
          type: 'state',
          rate: 0.05,
          applicableThreshold: 0,
        },
      ];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);

      // Act
      const { result } = renderHook(() => useTaxRules(), { wrapper });

      // Assert - Initial state
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Success state
      expect(result.current.data).toEqual(mockTaxRules);
      expect(result.current.isLoading).toBe(false);
      expect(taxService.getTaxRules).toHaveBeenCalledWith(undefined);
    });

    it('should fetch tax rules with filters', async () => {
      // Arrange
      const filters = { type: 'federal' };
      const mockTaxRules = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Federal Income Tax',
          type: 'federal',
          rate: 0.22,
        },
      ];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);

      // Act
      const { result } = renderHook(() => useTaxRules(filters), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockTaxRules);
      expect(taxService.getTaxRules).toHaveBeenCalledWith(filters);
    });

    it('should handle fetch errors gracefully', async () => {
      // Arrange
      const error = new Error('Failed to fetch tax rules');
      vi.mocked(taxService.getTaxRules).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useTaxRules(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array when no tax rules exist', async () => {
      // Arrange
      vi.mocked(taxService.getTaxRules).mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => useTaxRules(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useTaxRule - fetching single tax rule', () => {
    it('should fetch a single tax rule by ID', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTaxRule = {
        id: taxRuleId,
        name: 'Federal Income Tax',
        type: 'federal',
        rate: 0.22,
        applicableThreshold: 40000,
      };
      vi.mocked(taxService.getTaxRule).mockResolvedValue(mockTaxRule);

      // Act
      const { result } = renderHook(() => useTaxRule(taxRuleId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockTaxRule);
      expect(taxService.getTaxRule).toHaveBeenCalledWith(taxRuleId);
    });

    it('should not fetch when ID is empty', async () => {
      // Arrange
      const emptyId = '';

      // Act
      const { result } = renderHook(() => useTaxRule(emptyId), { wrapper });

      // Assert - Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(taxService.getTaxRule).not.toHaveBeenCalled();
    });

    it('should handle fetch error for single tax rule', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Tax rule not found');
      vi.mocked(taxService.getTaxRule).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useTaxRule(taxRuleId), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateTaxRule - mutation', () => {
    it('should create a tax rule successfully', async () => {
      // Arrange
      const newTaxRule = {
        name: 'Medicare Tax',
        type: 'federal',
        rate: 0.0145,
        applicableThreshold: 0,
      };
      const createdTaxRule = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        ...newTaxRule,
      };
      vi.mocked(taxService.createTaxRule).mockResolvedValue(createdTaxRule);

      // Act
      const { result } = renderHook(() => useCreateTaxRule(), { wrapper });

      result.current.mutate(newTaxRule);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(createdTaxRule);
      expect(taxService.createTaxRule).toHaveBeenCalledWith(newTaxRule);
    });

    it('should invalidate tax rules cache after successful creation', async () => {
      // Arrange
      const newTaxRule = { name: 'Social Security', type: 'federal', rate: 0.062 };
      const createdTaxRule = { id: '423e4567-e89b-12d3-a456-426614174003', ...newTaxRule };
      vi.mocked(taxService.createTaxRule).mockResolvedValue(createdTaxRule);

      // Pre-populate cache
      queryClient.setQueryData(['tax-rules'], []);

      // Act
      const { result } = renderHook(() => useCreateTaxRule(), { wrapper });
      result.current.mutate(newTaxRule);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Cache should be invalidated
      const queryState = queryClient.getQueryState(['tax-rules']);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const newTaxRule = { name: 'Invalid', type: 'federal', rate: -0.1 };
      const error = new Error('Invalid tax rate');
      vi.mocked(taxService.createTaxRule).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreateTaxRule(), { wrapper });
      result.current.mutate(newTaxRule);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateTaxRule - mutation', () => {
    it('should update a tax rule successfully', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { rate: 0.24 };
      const updatedTaxRule = {
        id: taxRuleId,
        name: 'Federal Income Tax',
        type: 'federal',
        rate: 0.24,
        applicableThreshold: 40000,
      };
      vi.mocked(taxService.updateTaxRule).mockResolvedValue(updatedTaxRule);

      // Act
      const { result } = renderHook(() => useUpdateTaxRule(), { wrapper });
      result.current.mutate({ id: taxRuleId, data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(updatedTaxRule);
      expect(taxService.updateTaxRule).toHaveBeenCalledWith(taxRuleId, updateData);
    });

    it('should invalidate both list and detail caches after update', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { rate: 0.25 };
      const updatedTaxRule = { id: taxRuleId, name: 'Test', rate: 0.25 };
      vi.mocked(taxService.updateTaxRule).mockResolvedValue(updatedTaxRule);

      // Pre-populate caches
      queryClient.setQueryData(['tax-rules'], []);
      queryClient.setQueryData(['tax-rules', taxRuleId], {});

      // Act
      const { result } = renderHook(() => useUpdateTaxRule(), { wrapper });
      result.current.mutate({ id: taxRuleId, data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      const listQueryState = queryClient.getQueryState(['tax-rules']);
      const detailQueryState = queryClient.getQueryState(['tax-rules', taxRuleId]);
      expect(listQueryState?.isInvalidated).toBe(true);
      expect(detailQueryState?.isInvalidated).toBe(true);
    });

    it('should handle update errors', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { rate: 1.5 }; // Invalid - too high
      const error = new Error('Tax rate must be between 0 and 1');
      vi.mocked(taxService.updateTaxRule).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useUpdateTaxRule(), { wrapper });
      result.current.mutate({ id: taxRuleId, data: updateData });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteTaxRule - mutation', () => {
    it('should delete a tax rule successfully', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(taxService.deleteTaxRule).mockResolvedValue(undefined);

      // Act
      const { result } = renderHook(() => useDeleteTaxRule(), { wrapper });
      result.current.mutate(taxRuleId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(taxService.deleteTaxRule).toHaveBeenCalledWith(taxRuleId);
    });

    it('should invalidate tax rules cache after deletion', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(taxService.deleteTaxRule).mockResolvedValue(undefined);

      // Pre-populate cache
      queryClient.setQueryData(['tax-rules'], [{ id: taxRuleId }]);

      // Act
      const { result } = renderHook(() => useDeleteTaxRule(), { wrapper });
      result.current.mutate(taxRuleId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      const queryState = queryClient.getQueryState(['tax-rules']);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const taxRuleId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Cannot delete tax rule in use');
      vi.mocked(taxService.deleteTaxRule).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useDeleteTaxRule(), { wrapper });
      result.current.mutate(taxRuleId);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useTax - combined hook', () => {
    it('should provide all tax functionality in one hook', async () => {
      // Arrange
      const mockTaxRules = [
        { id: '123', name: 'Test Tax', type: 'federal', rate: 0.15 },
      ];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);

      // Act
      const { result } = renderHook(() => useTax(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingRules).toBe(false));

      // Assert - Query data
      expect(result.current.taxRules).toEqual(mockTaxRules);
      expect(result.current.isLoadingRules).toBe(false);
      expect(result.current.isErrorRules).toBe(false);

      // Assert - Mutation objects exist (not just functions)
      expect(result.current.createTaxRule).toBeDefined();
      expect(result.current.updateTaxRule).toBeDefined();
      expect(result.current.deleteTaxRule).toBeDefined();
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });

    it('should handle combined hook with filters', async () => {
      // Arrange
      const filters = { type: 'state' };
      const mockTaxRules = [
        { id: '123', name: 'State Tax', type: 'state', rate: 0.05 },
      ];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);

      // Act
      const { result } = renderHook(() => useTax(filters), { wrapper });

      await waitFor(() => !result.current.isLoadingRules);

      // Assert
      expect(result.current.taxRules).toEqual(mockTaxRules);
      expect(taxService.getTaxRules).toHaveBeenCalledWith(filters);
    });

    it('should expose mutation loading states', async () => {
      // Arrange
      const mockTaxRules = [];
      const newTaxRule = { name: 'New Tax', type: 'local', rate: 0.02 };
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);
      vi.mocked(taxService.createTaxRule).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: '1', ...newTaxRule }), 100))
      );

      // Act
      const { result } = renderHook(() => useTax(), { wrapper });

      await waitFor(() => !result.current.isLoadingRules);

      result.current.createTaxRule.mutate(newTaxRule);

      // Assert - Creating state should be true while mutation is pending
      await waitFor(() => expect(result.current.isCreating).toBe(true));
    });

    it('should return mutation objects with mutate and mutateAsync methods', async () => {
      // Arrange
      const mockTaxRules = [];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);

      // Act
      const { result } = renderHook(() => useTax(), { wrapper });

      await waitFor(() => !result.current.isLoadingRules);

      // Assert - Mutation objects should have both mutate and mutateAsync
      expect(result.current.createTaxRule.mutate).toBeDefined();
      expect(result.current.createTaxRule.mutateAsync).toBeDefined();
      expect(result.current.updateTaxRule.mutate).toBeDefined();
      expect(result.current.updateTaxRule.mutateAsync).toBeDefined();
      expect(result.current.deleteTaxRule.mutate).toBeDefined();
      expect(result.current.deleteTaxRule.mutateAsync).toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should use correct query key for caching', async () => {
      // Arrange
      const filters = { type: 'federal' };
      vi.mocked(taxService.getTaxRules).mockResolvedValue([]);

      // Act
      renderHook(() => useTaxRules(filters), { wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['tax-rules', filters]);
        expect(queryState).toBeDefined();
      });
    });

    it('should cache results and not refetch on remount', async () => {
      // Arrange
      const mockData = [{ id: '123', name: 'Test', type: 'federal', rate: 0.15 }];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockData);

      // Act - First mount
      const { unmount } = renderHook(() => useTaxRules(), { wrapper });
      await waitFor(() =>
        expect(taxService.getTaxRules).toHaveBeenCalledTimes(1)
      );

      // Unmount and remount
      unmount();
      renderHook(() => useTaxRules(), { wrapper });

      // Assert - Should use cache, not refetch
      expect(taxService.getTaxRules).toHaveBeenCalledTimes(1);
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error: timeout');
      vi.mocked(taxService.getTaxRules).mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() => useTaxRules(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(networkError);
      expect(result.current.error?.message).toContain('Network error');
    });

    it('should handle authorization errors', async () => {
      // Arrange
      const authError = new Error('Unauthorized: Invalid token');
      vi.mocked(taxService.getTaxRules).mockRejectedValue(authError);

      // Act
      const { result } = renderHook(() => useTaxRules(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error?.message).toContain('Unauthorized');
    });

    it('should handle validation errors from API', async () => {
      // Arrange
      const validationError = new Error('Validation failed: rate must be positive');
      const newTaxRule = { name: 'Test', type: 'federal', rate: -0.1 };
      vi.mocked(taxService.createTaxRule).mockRejectedValue(validationError);

      // Act
      const { result } = renderHook(() => useCreateTaxRule(), { wrapper });
      result.current.mutate(newTaxRule);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error?.message).toContain('Validation failed');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined filters gracefully', async () => {
      // Arrange
      const mockTaxRules = [{ id: '123', name: 'Tax', type: 'federal', rate: 0.1 }];
      vi.mocked(taxService.getTaxRules).mockResolvedValue(mockTaxRules);

      // Act
      const { result } = renderHook(() => useTaxRules(undefined), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockTaxRules);
      expect(taxService.getTaxRules).toHaveBeenCalledWith(undefined);
    });

    it('should handle tax rules with complex threshold structures', async () => {
      // Arrange
      const complexTaxRule = {
        id: '123',
        name: 'Progressive Tax',
        type: 'federal',
        rate: 0.22,
        brackets: [
          { threshold: 0, rate: 0.10 },
          { threshold: 10000, rate: 0.15 },
          { threshold: 40000, rate: 0.22 },
        ],
      };
      vi.mocked(taxService.getTaxRule).mockResolvedValue(complexTaxRule);

      // Act
      const { result } = renderHook(() => useTaxRule('123'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(complexTaxRule);
      expect(result.current.data?.brackets).toHaveLength(3);
    });
  });
});
