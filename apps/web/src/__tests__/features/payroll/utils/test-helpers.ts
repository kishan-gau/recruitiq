/**
 * Test Utilities for Payroll Feature Tests
 * 
 * Provides common mocks, factories, and helpers for payroll-related tests.
 * Following industry standards from TESTING_STANDARDS.md
 */

import { QueryClient } from '@tanstack/react-query';

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
