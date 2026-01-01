/**
 * Test Utilities for Payroll Feature Tests
 * 
 * Provides common mocks, factories, and helpers for payroll-related tests.
 * Following industry standards from TESTING_STANDARDS.md
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * Creates a fresh QueryClient instance for tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Factory for creating mock payroll run data
 */
export const createMockPayrollRun = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  runCode: 'RUN-001',
  status: 'pending',
  period: 'monthly',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  totalEmployees: 50,
  ...overrides,
});

/**
 * Factory for creating mock compensation data
 */
export const createMockCompensation = (overrides = {}) => ({
  id: '223e4567-e89b-12d3-a456-426614174001',
  employeeId: '323e4567-e89b-12d3-a456-426614174002',
  baseSalary: 50000,
  currency: 'USD',
  effectiveDate: '2025-01-01',
  ...overrides,
});

/**
 * Factory for creating mock deduction data
 */
export const createMockDeduction = (overrides = {}) => ({
  id: '323e4567-e89b-12d3-a456-426614174002',
  name: 'Health Insurance',
  type: 'pre-tax',
  amount: 200,
  ...overrides,
});

/**
 * Factory for creating mock tax rule data
 */
export const createMockTaxRule = (overrides = {}) => ({
  id: '423e4567-e89b-12d3-a456-426614174003',
  name: 'Federal Income Tax',
  type: 'federal',
  rate: 0.22,
  applicableThreshold: 40000,
  ...overrides,
});

/**
 * Factory for creating mock pay component data
 */
export const createMockPayComponent = (overrides = {}) => ({
  id: '523e4567-e89b-12d3-a456-426614174004',
  componentCode: 'BASIC_SALARY',
  componentName: 'Basic Salary',
  componentType: 'earnings',
  calculationType: 'fixed',
  isActive: true,
  isTaxable: true,
  displayOrder: 1,
  ...overrides,
});

/**
 * Factory for creating mock worker data
 */
export const createMockWorker = (overrides = {}) => ({
  id: '623e4567-e89b-12d3-a456-426614174005',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  employmentType: 'full-time',
  status: 'active',
  ...overrides,
});

/**
 * Factory for creating mock worker type template data
 */
export const createMockWorkerTypeTemplate = (overrides = {}) => ({
  id: '723e4567-e89b-12d3-a456-426614174006',
  code: 'FULL_TIME',
  name: 'Full Time Employee',
  version: 1,
  defaultPayFrequency: 'monthly',
  benefitsEligible: true,
  ...overrides,
});

/**
 * Factory for creating mock API error
 */
export const createMockApiError = (message = 'API Error', status = 500) => {
  const error: any = new Error(message);
  error.response = {
    data: { error: message },
    status,
  };
  return error;
};

/**
 * Factory for creating mock validation error
 */
export const createMockValidationError = (errors: Record<string, string>) => {
  const error: any = new Error('Validation failed');
  error.validationErrors = errors;
  error.response = {
    data: { error: 'Validation failed', errors },
    status: 422,
  };
  return error;
};

/**
 * Generates a valid UUID v4
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Generates an array of mock data using a factory function
 */
export const generateMockArray = <T>(factory: (overrides?: any) => T, count: number, overridesFn?: (index: number) => any): T[] => {
  return Array.from({ length: count }, (_, index) => 
    factory(overridesFn ? overridesFn(index) : {})
  );
};

/**
 * Waits for a specific amount of time (useful for async testing)
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock React Query wrapper for testing
 */
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client }, children)
  );
};

