import '@testing-library/jest-dom/vitest';
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './mocks/server';

// Extend Vitest matchers
expect.extend(matchers);

// Mock the usePaylinqAPI hook before tests run
vi.mock('@/hooks/usePaylinqAPI', () => {
  const mockPaylinqAPI = {
    createPayrollRun: vi.fn().mockResolvedValue({
      success: true,
      payrollRun: {
        id: 'PR-TEST-001',
        run_number: 'PR-2025-11-001',
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    }),
    getWorkers: vi.fn().mockResolvedValue({
      success: true,
      employees: [],
    }),
  };

  return {
    usePaylinqAPI: () => ({
      paylinq: mockPaylinqAPI,
      auth: {},
      client: {},
    }),
    paylinqAPI: mockPaylinqAPI,
    authAPI: {},
    default: {
      paylinq: mockPaylinqAPI,
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
