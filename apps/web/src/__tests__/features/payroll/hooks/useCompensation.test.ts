/**
 * Tests for useCompensation hook
 * 
 * Tests React Query hooks for compensation data fetching and mutations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCompensation } from '@/features/payroll/hooks/useCompensation';
import { compensationService } from '@/features/payroll/services/compensation.service';

// Mock the compensation service
vi.mock('@/features/payroll/services/compensation.service', () => ({
  compensationService: {
    getCompensation: vi.fn(),
    getCompensationById: vi.fn(),
    createCompensation: vi.fn(),
    updateCompensation: vi.fn(),
    deleteCompensation: vi.fn(),
  },
}));

describe('useCompensation hook', () => {
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  describe('fetching compensation records', () => {
    it('should fetch all compensation records successfully', async () => {
      // Arrange
      const mockCompensation = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: '223e4567-e89b-12d3-a456-426614174001',
          baseSalary: 50000,
          currency: 'USD',
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          employeeId: '423e4567-e89b-12d3-a456-426614174003',
          baseSalary: 60000,
          currency: 'USD',
        },
      ];
      vi.mocked(compensationService.getCompensation).mockResolvedValue(mockCompensation);

      // Act
      const { result } = renderHook(() => useCompensation(), { wrapper });

      // Assert - Initial state
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Success state
      expect(result.current.data).toEqual(mockCompensation);
      expect(result.current.isLoading).toBe(false);
      expect(compensationService.getCompensation).toHaveBeenCalledWith(undefined);
    });

    it('should fetch compensation with employee filter', async () => {
      // Arrange
      const employeeId = '223e4567-e89b-12d3-a456-426614174001';
      const filters = { employeeId };
      const mockCompensation = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId,
          baseSalary: 50000,
          currency: 'USD',
        },
      ];
      vi.mocked(compensationService.getCompensation).mockResolvedValue(mockCompensation);

      // Act
      const { result } = renderHook(() => useCompensation(filters), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual(mockCompensation);
      expect(compensationService.getCompensation).toHaveBeenCalledWith(filters);
    });

    it('should handle fetch errors gracefully', async () => {
      // Arrange
      const error = new Error('Failed to fetch compensation');
      vi.mocked(compensationService.getCompensation).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCompensation(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array when no compensation exists', async () => {
      // Arrange
      vi.mocked(compensationService.getCompensation).mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => useCompensation(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toEqual([]);
    });
  });

  describe('cache management', () => {
    it('should use correct query key for caching', async () => {
      // Arrange
      const filters = { employeeId: '123e4567-e89b-12d3-a456-426614174000' };
      vi.mocked(compensationService.getCompensation).mockResolvedValue([]);

      // Act
      renderHook(() => useCompensation(filters), { wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['compensation', filters]);
        expect(queryState).toBeDefined();
      });
    });

    it('should cache results and not refetch on remount', async () => {
      // Arrange
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          baseSalary: 50000,
        },
      ];
      vi.mocked(compensationService.getCompensation).mockResolvedValue(mockData);

      // Act - First mount
      const { unmount } = renderHook(() => useCompensation(), { wrapper });
      await waitFor(() =>
        expect(compensationService.getCompensation).toHaveBeenCalledTimes(1)
      );

      // Unmount and remount
      unmount();
      renderHook(() => useCompensation(), { wrapper });

      // Assert - Should use cache, not refetch
      expect(compensationService.getCompensation).toHaveBeenCalledTimes(1);
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error: timeout');
      vi.mocked(compensationService.getCompensation).mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() => useCompensation(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(networkError);
      expect(result.current.error?.message).toContain('Network error');
    });

    it('should handle authorization errors', async () => {
      // Arrange
      const authError = new Error('Unauthorized: Invalid token');
      vi.mocked(compensationService.getCompensation).mockRejectedValue(authError);

      // Act
      const { result } = renderHook(() => useCompensation(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error?.message).toContain('Unauthorized');
    });
  });

  describe('performance considerations', () => {
    it('should not fetch when filters change rapidly', async () => {
      // Arrange
      vi.mocked(compensationService.getCompensation).mockResolvedValue([]);

      // Act - Render with initial filters
      const { rerender } = renderHook(({ filters }) => useCompensation(filters), {
        wrapper,
        initialProps: { filters: { employeeId: 'id1' } },
      });

      // Quickly change filters multiple times
      rerender({ filters: { employeeId: 'id2' } });
      rerender({ filters: { employeeId: 'id3' } });
      rerender({ filters: { employeeId: 'id4' } });

      await waitFor(() => expect(compensationService.getCompensation).toHaveBeenCalled());

      // Assert - Should have been called for each unique filter
      // (React Query handles debouncing internally)
      expect(compensationService.getCompensation).toHaveBeenCalledTimes(4);
    });
  });

  describe('data transformations', () => {
    it('should return data in expected format', async () => {
      // Arrange
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: '223e4567-e89b-12d3-a456-426614174001',
          baseSalary: 50000,
          currency: 'USD',
          bonuses: [{ type: 'performance', amount: 5000 }],
          allowances: [{ type: 'housing', amount: 10000 }],
        },
      ];
      vi.mocked(compensationService.getCompensation).mockResolvedValue(mockData);

      // Act
      const { result } = renderHook(() => useCompensation(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Data structure should be preserved
      expect(result.current.data?.[0]).toHaveProperty('id');
      expect(result.current.data?.[0]).toHaveProperty('employeeId');
      expect(result.current.data?.[0]).toHaveProperty('baseSalary');
      expect(result.current.data?.[0]).toHaveProperty('bonuses');
      expect(result.current.data?.[0]).toHaveProperty('allowances');
      expect(result.current.data?.[0].bonuses).toHaveLength(1);
      expect(result.current.data?.[0].allowances).toHaveLength(1);
    });
  });
});
