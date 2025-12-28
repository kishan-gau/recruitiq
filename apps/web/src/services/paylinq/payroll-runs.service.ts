import { PaylinqClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const paylinqClient = new PaylinqClient(apiClient);

export const payrollRunsService = {
  /**
   * Lists all payroll runs with optional filters
   */
  async getPayrollRuns(filters?: any) {
    // PaylinqClient expects PayrollRunFilters & PaginationParams
    // For now, pass through and let the client handle type coercion
    // PaginatedResponse has .data (array) and .pagination (metadata)
    const response = await paylinqClient.getPayrollRuns(filters as any);
    return response.data;
  },

  /**
   * Gets a single payroll run by ID
   */
  async getPayrollRun(id: string) {
    // PaylinqClient returns PayrollRunResponse which IS the payroll run directly
    const payrollRun = await paylinqClient.getPayrollRun(id);
    return payrollRun;
  },

  /**
   * Creates a new payroll run
   */
  async createPayrollRun(data: any) {
    const response = await paylinqClient.createPayrollRun(data);
    return response.data;
  },

  /**
   * Updates a payroll run
   */
  async updatePayrollRun(id: string, updates: any) {
    const response = await paylinqClient.updatePayrollRun(id, updates);
    return response.data;
  },

  /**
   * Processes/executes a payroll run
   */
  async processPayrollRun(data: any) {
    // PaylinqClient returns PayrollRunResponse which IS the payroll run directly
    const payrollRun = await paylinqClient.processPayrollRun(data);
    return payrollRun;
  },
};
