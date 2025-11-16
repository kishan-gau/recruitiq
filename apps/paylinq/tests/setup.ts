import '@testing-library/jest-dom/vitest';
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './mocks/server';

// Extend Vitest matchers
expect.extend(matchers);

// Mock the usePaylinqAPI hook before tests run
vi.mock('@/hooks/usePaylinqAPI', () => {
  const mockPaylinqClient = {
    createPayrollRun: vi.fn().mockResolvedValue({
      success: true,
      payrollRun: {
        id: 'PR-TEST-001',
        run_number: 'PR-2025-11-001',
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    }),
    getDashboard: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_workers: 25,
        active_workers: 23,
        pending_timesheets: 5,
        payroll_runs_count: 12,
        total_payroll_amount: 245000.00,
        recent_payroll_runs: [
          {
            id: 'PR-001',
            run_number: 'PR-2025-11-001',
            period: 'November 2025',
            status: 'processed',
            total_amount: 125000.00,
          },
        ],
      },
    }),
    getWorkers: vi.fn().mockResolvedValue({
      success: true,
      employees: [
        {
          id: 'W001',
          employee_number: '123456',
          full_name: 'John Doe',
          worker_type: 'Full-Time',
          compensation_type: 'salary',
          compensation_amount: 60000,
          status: 'active',
        },
        {
          id: 'W002',
          employee_number: '123457',
          full_name: 'Jane Smith',
          worker_type: 'Part-Time',
          compensation_type: 'hourly',
          compensation_amount: 25,
          status: 'active',
        },
      ],
    }),
  };

  return {
    usePaylinqAPI: () => ({
      paylinq: mockPaylinqClient,
      auth: {},
      client: {},
    }),
    paylinqAPI: mockPaylinqClient,
    authAPI: {},
    default: {
      paylinq: mockPaylinqClient,
      auth: {},
    },
  };
});

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers and cleanup after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock environment variables
vi.stubEnv('VITE_API_URL', 'http://localhost:4000/api');

// Mock window.matchMedia (for theme tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
