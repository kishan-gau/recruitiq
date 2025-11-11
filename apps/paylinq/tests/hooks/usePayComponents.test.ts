/**
 * usePayComponents Hook Tests
 * 
 * Tests the actual hook logic including API response parsing.
 * These tests ensure the hook correctly handles API responses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePayComponents, usePayComponent, useCreatePayComponent } from '@/hooks/usePayComponents';
import { ToastProvider } from '@/contexts/ToastContext';
import { createElement, type ReactNode } from 'react';

// Mock the API client
const mockGetPayComponents = vi.fn();
const mockGetPayComponent = vi.fn();
const mockCreatePayComponent = vi.fn();

// Mock PaylinqAPIProvider component for test wrapper
const PaylinqAPIProvider = ({ children }: { children: ReactNode }) => children;

vi.mock('@/hooks/usePaylinqAPI', () => ({
  usePaylinqAPI: () => ({
    paylinq: {
      getPayComponents: mockGetPayComponents,
      getPayComponent: mockGetPayComponent,
      createPayComponent: mockCreatePayComponent,
    },
  }),
}));

describe('usePayComponents Hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient },
      createElement(PaylinqAPIProvider, null,
        createElement(ToastProvider, null, children)
      )
    );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('usePayComponents (list)', () => {
    it('should parse API response with payComponents key correctly', async () => {
      const mockResponse = {
        success: true,
        payComponents: [
          {
            id: '1',
            componentCode: 'BASE',
            componentName: 'Base Salary',
            componentType: 'earning',
            category: 'Regular Pay',
            calculationType: 'fixed',
            defaultAmount: 5000,
            isRecurring: true,
            isTaxable: true,
            isSystemComponent: false,
            isPreTax: false,
            appliesToGross: true,
            status: 'active',
            description: 'Base salary',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockGetPayComponents.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse.payComponents);
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].componentName).toBe('Base Salary');
    });

    it('should handle empty payComponents array', async () => {
      const mockResponse = {
        success: true,
        payComponents: [],
      };

      mockGetPayComponents.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should throw error when response.data is undefined', async () => {
      mockGetPayComponents.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error).message).toContain('No data received from server');
    });

    it('should handle missing payComponents key with fallback to empty array', async () => {
      const mockResponse = {
        success: true,
        // Missing payComponents key
      };

      mockGetPayComponents.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePayComponents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('usePayComponent (single)', () => {
    it('should parse API response with payComponent key correctly', async () => {
      const mockResponse = {
        success: true,
        payComponent: {
          id: '1',
          componentCode: 'BASE',
          componentName: 'Base Salary',
          componentType: 'earning',
          category: 'Regular Pay',
          calculationType: 'fixed',
          defaultAmount: 5000,
          isRecurring: true,
          isTaxable: true,
          isSystemComponent: false,
          isPreTax: false,
          appliesToGross: true,
          status: 'active',
          description: 'Base salary',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockGetPayComponent.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePayComponent('1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse.payComponent);
      expect(result.current.data?.componentName).toBe('Base Salary');
    });

    it('should throw error when response.data is undefined', async () => {
      mockGetPayComponent.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePayComponent('1'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error).message).toContain('No data received from server');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => usePayComponent(''), { wrapper });

      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetPayComponent).not.toHaveBeenCalled();
    });
  });

  describe('useCreatePayComponent', () => {
    it('should parse API response with payComponent key correctly', async () => {
      const mockResponse = {
        success: true,
        payComponent: {
          id: '1',
          componentCode: 'NEW',
          componentName: 'New Component',
          componentType: 'earning',
          category: 'Regular Pay',
          calculationType: 'fixed',
          defaultAmount: 1000,
          isRecurring: true,
          isTaxable: true,
          isSystemComponent: false,
          isPreTax: false,
          appliesToGross: true,
          status: 'active',
          description: 'Test component',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        message: 'Pay component created successfully',
      };

      mockCreatePayComponent.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });

      const newComponent = {
        name: 'New Component',
        code: 'NEW',
        type: 'earning' as const,
        category: 'Regular Pay',
        calculationType: 'fixed' as const,
        defaultValue: 1000,
        isRecurring: true,
        isTaxable: true,
        status: 'active' as const,
        description: 'Test component',
      };

      result.current.mutate(newComponent);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse.payComponent);
      expect(result.current.data?.componentName).toBe('New Component');
    });

    it('should throw error when response.data is undefined', async () => {
      mockCreatePayComponent.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });

      const newComponent = {
        name: 'New Component',
        code: 'NEW',
        type: 'earning' as const,
        category: 'Regular Pay',
        calculationType: 'fixed' as const,
        defaultValue: 1000,
        isRecurring: true,
        isTaxable: true,
        status: 'active' as const,
        description: 'Test component',
      };

      result.current.mutate(newComponent);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error).message).toContain('No data received from server');
    });

    it('should map frontend data to backend API format correctly', async () => {
      const mockResponse = {
        success: true,
        payComponent: {
          id: '1',
          name: 'Test',
          code: 'TEST',
          type: 'earning',
          category: 'Regular Pay',
          calculationType: 'fixed',
          defaultValue: 100,
          isRecurring: true,
          isTaxable: true,
          status: 'active',
          description: 'Test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockCreatePayComponent.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreatePayComponent(), { wrapper });

      result.current.mutate({
        name: 'Test',
        code: 'TEST',
        type: 'earning',
        category: 'Regular Pay',
        calculationType: 'fixed',
        defaultValue: 100,
        isRecurring: true,
        isTaxable: true,
        status: 'active',
        description: 'Test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the API was called with correct backend format
      expect(mockCreatePayComponent).toHaveBeenCalledWith({
        code: 'TEST',
        name: 'Test',
        componentType: 'earning', // Frontend 'type' → Backend 'componentType'
        category: 'Regular Pay',
        calculationMethod: 'fixed', // Frontend 'calculationType' → Backend 'calculationMethod'
        isRecurring: true,
        isTaxable: true,
        isActive: true, // Frontend 'status: active' → Backend 'isActive: true'
        description: 'Test',
        defaultAmount: 100, // Frontend 'defaultValue' → Backend 'defaultAmount'
      });
    });
  });
});
