import { vi } from 'vitest';

// Mock successful API response
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
  getWorkers: vi.fn().mockResolvedValue({
    success: true,
    employees: [],
  }),
  // Add other methods as needed
};

export const usePaylinqAPI = vi.fn(() => ({
  paylinq: mockPaylinqClient,
  auth: {},
  client: {},
}));

export { mockPaylinqClient };
