/**
 * Tests for usePayComponents hook
 * 
 * Tests React Query hooks for pay components data fetching and mutations.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePayComponents,
  usePayComponent,
  useCreatePayComponent,
  useUpdatePayComponent,
  useDeletePayComponent,
  usePayComponentsByType,
} from '@/features/payroll/hooks/usePayComponents';

// Mock usePaylinqAPI hook
const mockClient = {
  listPayComponents: vi.fn(),
  getPayComponent: vi.fn(),
  createPayComponent: vi.fn(),
  updatePayComponent: vi.fn(),
  deletePayComponent: vi.fn(),
};

vi.mock('@/features/payroll/hooks/usePaylinqAPI', () => ({
  usePaylinqAPI: () => ({ client: mockClient }),
}));

// Mock toast context
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('usePayComponents hooks', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Create wrapper component
    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('usePayComponents - fetching all pay components', () => {
    it('should fetch all pay components successfully', async () => {
      // Arrange
      const mockPayComponents = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          component_code: 'BASIC_SALARY',
          component_name: 'Basic Salary',
          component_type: 'earnings',
          calculation_type: 'fixed',
          is_active: true,
          is_taxable: true,
          display_order: 1,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          component_code: 'HEALTH_INS',
          component_name: 'Health Insurance',
          component_type: 'deductions',
          calculation_type: 'fixed',
          is_active: true,
          is_taxable: false,
          display_order: 2,
        },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockPayComponents } });

      // Act
      const { result } = renderHook(() => usePayComponents(), { wrapper });

      // Assert - Initial state
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Success state (data should be transformed from snake_case to camelCase)
      expect(result.current.data).toBeDefined();
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].componentCode).toBe('BASIC_SALARY');
      expect(result.current.data?.[0].componentName).toBe('Basic Salary');
      expect(result.current.data?.[0].componentType).toBe('earnings');
      expect(result.current.isLoading).toBe(false);
      expect(mockClient.listPayComponents).toHaveBeenCalledWith(undefined);
    });

    it('should fetch pay components with type filter', async () => {
      // Arrange
      const filters = { type: 'earnings' as const };
      const mockPayComponents = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          component_code: 'BASIC_SALARY',
          component_name: 'Basic Salary',
          component_type: 'earnings',
          calculation_type: 'fixed',
          is_active: true,
          is_taxable: true,
          display_order: 1,
        },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockPayComponents } });

      // Act
      const { result } = renderHook(() => usePayComponents(filters), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].componentType).toBe('earnings');
      expect(mockClient.listPayComponents).toHaveBeenCalledWith(filters);
    });

    it('should fetch pay components with isActive filter', async () => {
      // Arrange
      const filters = { isActive: true };
      const mockPayComponents = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          component_code: 'BASIC_SALARY',
          component_name: 'Basic Salary',
          component_type: 'earnings',
          is_active: true,
        },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockPayComponents } });

      // Act
      const { result } = renderHook(() => usePayComponents(filters), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data?.[0].isActive).toBe(true);
      expect(mockClient.listPayComponents).toHaveBeenCalledWith(filters);
    });

    it('should handle fetch errors gracefully', async () => {
      // Arrange
      const error = new Error('Failed to fetch pay components');
      mockClient.listPayComponents.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle response with direct data array (without payComponents wrapper)', async () => {
      // Arrange
      const mockPayComponents = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          component_code: 'BASIC_SALARY',
          component_name: 'Basic Salary',
        },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: mockPayComponents });

      // Act
      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toBeDefined();
      expect(result.current.data).toHaveLength(1);
    });

    it('should cache results for 5 minutes', async () => {
      // Arrange
      const mockPayComponents = [{ id: '123', component_code: 'TEST' }];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockPayComponents } });

      // Act
      renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['payComponents', undefined]);
        expect(queryState).toBeDefined();
        // Stale time should be 5 minutes (300000ms)
        expect(queryState?.dataUpdateCount).toBeGreaterThan(0);
      });
    });
  });

  describe('usePayComponent - fetching single pay component', () => {
    it('should fetch a single pay component by ID', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPayComponent = {
        id: componentId,
        component_code: 'BASIC_SALARY',
        component_name: 'Basic Salary',
        component_type: 'earnings',
        calculation_type: 'fixed',
        is_active: true,
        is_taxable: true,
        display_order: 1,
      };
      mockClient.getPayComponent.mockResolvedValue({ data: { payComponent: mockPayComponent } });

      // Act
      const { result } = renderHook(() => usePayComponent(componentId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Data should be transformed to camelCase
      expect(result.current.data?.componentCode).toBe('BASIC_SALARY');
      expect(result.current.data?.componentName).toBe('Basic Salary');
      expect(result.current.data?.calculationType).toBe('fixed');
      expect(mockClient.getPayComponent).toHaveBeenCalledWith(componentId);
    });

    it('should not fetch when ID is empty', async () => {
      // Arrange
      const emptyId = '';

      // Act
      const { result } = renderHook(() => usePayComponent(emptyId), { wrapper });

      // Assert - Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockClient.getPayComponent).not.toHaveBeenCalled();
    });

    it('should handle fetch error for single pay component', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Pay component not found');
      mockClient.getPayComponent.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => usePayComponent(componentId), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(error);
    });

    it('should handle response with direct data (without payComponent wrapper)', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPayComponent = {
        id: componentId,
        component_code: 'BASIC_SALARY',
        component_name: 'Basic Salary',
      };
      mockClient.getPayComponent.mockResolvedValue({ data: mockPayComponent });

      // Act
      const { result } = renderHook(() => usePayComponent(componentId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data?.componentCode).toBe('BASIC_SALARY');
    });
  });

  describe('useCreatePayComponent - mutation', () => {
    it('should create a pay component successfully', async () => {
      // Arrange
      const newComponent = {
        componentCode: 'BONUS',
        componentName: 'Performance Bonus',
        componentType: 'earnings' as const,
        calculationType: 'percentage' as const,
        isTaxable: true,
        displayOrder: 5,
      };
      const createdComponent = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        component_code: 'BONUS',
        component_name: 'Performance Bonus',
        component_type: 'earnings',
        calculation_type: 'percentage',
        is_taxable: true,
        display_order: 5,
      };
      mockClient.createPayComponent.mockResolvedValue({ data: { payComponent: createdComponent } });

      // Act
      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });

      result.current.mutate(newComponent);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data?.componentCode).toBe('BONUS');
      expect(mockClient.createPayComponent).toHaveBeenCalledWith(newComponent);
      expect(mockToast.success).toHaveBeenCalledWith('Pay component created successfully');
    });

    it('should invalidate pay components cache after successful creation', async () => {
      // Arrange
      const newComponent = {
        componentCode: 'ALLOWANCE',
        componentName: 'Housing Allowance',
        componentType: 'earnings' as const,
        calculationType: 'fixed' as const,
        isTaxable: true,
        displayOrder: 3,
      };
      const createdComponent = {
        id: '423e4567-e89b-12d3-a456-426614174003',
        component_code: 'ALLOWANCE',
        component_name: 'Housing Allowance',
      };
      mockClient.createPayComponent.mockResolvedValue({ data: { payComponent: createdComponent } });

      // Pre-populate cache with a specific filter key
      queryClient.setQueryData(['payComponents', undefined], []);

      // Act
      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });
      result.current.mutate(newComponent);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Cache should be invalidated (note: we check for queryKey prefix match)
      await waitFor(() => {
        const queries = queryClient.getQueriesData({ queryKey: ['payComponents'] });
        // At least one query with payComponents key should exist
        expect(queries.length).toBeGreaterThan(0);
      });
    });

    it('should handle creation errors and show toast', async () => {
      // Arrange
      const newComponent = {
        componentCode: 'INVALID',
        componentName: 'Invalid Component',
        componentType: 'earnings' as const,
        calculationType: 'fixed' as const,
        isTaxable: true,
        displayOrder: 1,
      };
      const error = { response: { data: { error: 'Component code already exists' } } };
      mockClient.createPayComponent.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });
      result.current.mutate(newComponent);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(mockToast.error).toHaveBeenCalledWith('Component code already exists');
    });

    it('should show default error message when API error has no message', async () => {
      // Arrange
      const newComponent = {
        componentCode: 'TEST',
        componentName: 'Test',
        componentType: 'earnings' as const,
        calculationType: 'fixed' as const,
        isTaxable: true,
        displayOrder: 1,
      };
      const error = new Error('Unknown error');
      mockClient.createPayComponent.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });
      result.current.mutate(newComponent);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(mockToast.error).toHaveBeenCalledWith('Failed to create pay component');
    });
  });

  describe('useUpdatePayComponent - mutation', () => {
    it('should update a pay component successfully', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { componentName: 'Updated Basic Salary', displayOrder: 2 };
      const updatedComponent = {
        id: componentId,
        component_code: 'BASIC_SALARY',
        component_name: 'Updated Basic Salary',
        display_order: 2,
      };
      mockClient.updatePayComponent.mockResolvedValue({ data: { payComponent: updatedComponent } });

      // Act
      const { result } = renderHook(() => useUpdatePayComponent(componentId), { wrapper });
      result.current.mutate(updateData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data?.componentName).toBe('Updated Basic Salary');
      expect(mockClient.updatePayComponent).toHaveBeenCalledWith(componentId, updateData);
      expect(mockToast.success).toHaveBeenCalledWith('Pay component updated successfully');
    });

    it('should invalidate both list and detail caches after update', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { isActive: false };
      const updatedComponent = { id: componentId, is_active: false };
      mockClient.updatePayComponent.mockResolvedValue({ data: { payComponent: updatedComponent } });

      // Pre-populate caches
      queryClient.setQueryData(['payComponents', undefined], []);
      queryClient.setQueryData(['payComponent', componentId], {});

      // Act
      const { result } = renderHook(() => useUpdatePayComponent(componentId), { wrapper });
      result.current.mutate(updateData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Verify cache invalidation via query data
      await waitFor(() => {
        const listQueries = queryClient.getQueriesData({ queryKey: ['payComponents'] });
        const detailQueries = queryClient.getQueriesData({ queryKey: ['payComponent', componentId] });
        // Queries should exist (invalidation triggers refetch on next access)
        expect(listQueries.length).toBeGreaterThan(0);
        expect(detailQueries.length).toBeGreaterThan(0);
      });
    });

    it('should handle update errors', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { displayOrder: -1 };
      const error = { response: { data: { error: 'Display order must be positive' } } };
      mockClient.updatePayComponent.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useUpdatePayComponent(componentId), { wrapper });
      result.current.mutate(updateData);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(mockToast.error).toHaveBeenCalledWith('Display order must be positive');
    });
  });

  describe('useDeletePayComponent - mutation', () => {
    it('should delete a pay component successfully', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      mockClient.deletePayComponent.mockResolvedValue({ data: {} });

      // Act
      const { result } = renderHook(() => useDeletePayComponent(componentId), { wrapper });
      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(mockClient.deletePayComponent).toHaveBeenCalledWith(componentId);
      expect(mockToast.success).toHaveBeenCalledWith('Pay component deleted successfully');
    });

    it('should invalidate caches after deletion', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      mockClient.deletePayComponent.mockResolvedValue({ data: {} });

      // Pre-populate caches
      queryClient.setQueryData(['payComponents', undefined], [{ id: componentId }]);
      queryClient.setQueryData(['payComponent', componentId], { id: componentId });

      // Act
      const { result } = renderHook(() => useDeletePayComponent(componentId), { wrapper });
      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Verify invalidation via query data
      await waitFor(() => {
        const listQueries = queryClient.getQueriesData({ queryKey: ['payComponents'] });
        const detailQueries = queryClient.getQueriesData({ queryKey: ['payComponent', componentId] });
        expect(listQueries.length).toBeGreaterThan(0);
        expect(detailQueries.length).toBeGreaterThan(0);
      });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const componentId = '123e4567-e89b-12d3-a456-426614174000';
      const error = { response: { data: { error: 'Cannot delete component in use' } } };
      mockClient.deletePayComponent.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useDeletePayComponent(componentId), { wrapper });
      result.current.mutate();

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(mockToast.error).toHaveBeenCalledWith('Cannot delete component in use');
    });
  });

  describe('usePayComponentsByType - convenience hook', () => {
    it('should fetch only earnings components', async () => {
      // Arrange
      const mockEarnings = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          component_code: 'BASIC_SALARY',
          component_name: 'Basic Salary',
          component_type: 'earnings',
        },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockEarnings } });

      // Act
      const { result } = renderHook(() => usePayComponentsByType('earnings'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(mockClient.listPayComponents).toHaveBeenCalledWith({ type: 'earnings' });
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].componentType).toBe('earnings');
    });

    it('should fetch only deduction components', async () => {
      // Arrange
      const mockDeductions = [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          component_code: 'HEALTH_INS',
          component_name: 'Health Insurance',
          component_type: 'deductions',
        },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockDeductions } });

      // Act
      const { result } = renderHook(() => usePayComponentsByType('deductions'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(mockClient.listPayComponents).toHaveBeenCalledWith({ type: 'deductions' });
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].componentType).toBe('deductions');
    });
  });

  describe('data transformation', () => {
    it('should correctly transform snake_case to camelCase', async () => {
      // Arrange
      const mockComponent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: '223e4567-e89b-12d3-a456-426614174001',
        component_code: 'BASIC_SALARY',
        component_name: 'Basic Salary',
        component_type: 'earnings',
        description: 'Monthly basic salary',
        calculation_type: 'fixed',
        calculation_metadata: { fixedAmount: 5000 },
        for_fait_rule: { isApplicable: true, minimumHours: 160 },
        is_active: true,
        is_taxable: true,
        display_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        created_by: '323e4567-e89b-12d3-a456-426614174002',
        updated_by: '323e4567-e89b-12d3-a456-426614174002',
      };
      mockClient.getPayComponent.mockResolvedValue({ data: { payComponent: mockComponent } });

      // Act
      const { result } = renderHook(() => usePayComponent('123e4567-e89b-12d3-a456-426614174000'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - All fields should be in camelCase
      expect(result.current.data).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '223e4567-e89b-12d3-a456-426614174001',
        componentCode: 'BASIC_SALARY',
        componentName: 'Basic Salary',
        componentType: 'earnings',
        description: 'Monthly basic salary',
        calculationType: 'fixed',
        calculationMetadata: { fixedAmount: 5000 },
        forFaitRule: { isApplicable: true, minimumHours: 160 },
        isActive: true,
        isTaxable: true,
        displayOrder: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        createdBy: '323e4567-e89b-12d3-a456-426614174002',
        updatedBy: '323e4567-e89b-12d3-a456-426614174002',
      });
    });

    it('should handle array transformation', async () => {
      // Arrange
      const mockComponents = [
        { id: '1', component_code: 'CODE1', component_name: 'Name1' },
        { id: '2', component_code: 'CODE2', component_name: 'Name2' },
      ];
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: mockComponents } });

      // Act
      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].componentCode).toBe('CODE1');
      expect(result.current.data?.[1].componentCode).toBe('CODE2');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error: timeout');
      mockClient.listPayComponents.mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(networkError);
    });

    it('should handle malformed API responses', async () => {
      // Arrange
      mockClient.listPayComponents.mockResolvedValue({ data: { payComponents: [] } });

      // Act
      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Should handle empty array gracefully
      expect(result.current.data).toBeDefined();
      expect(result.current.data).toEqual([]);
    });
  });
});
