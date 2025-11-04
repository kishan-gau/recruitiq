import { APIClient } from '../core/client';

/**
 * Paylinq Product API
 * Payroll management system endpoints
 */
export class PaylinqAPI {
  constructor(private client: APIClient) {}

  // ============================================================================
  // Workers
  // ============================================================================

  async getWorkers(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/workers${query ? '?' + query : ''}`);
  }

  async getWorker(id: string) {
    return this.client.get(`/paylinq/workers/${id}`);
  }

  async createWorker(data: any) {
    return this.client.post('/paylinq/workers', data);
  }

  async updateWorker(id: string, data: any) {
    return this.client.put(`/paylinq/workers/${id}`, data);
  }

  async deleteWorker(id: string) {
    return this.client.delete(`/paylinq/workers/${id}`);
  }

  async getWorkerPayslips(id: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/workers/${id}/payslips${query ? '?' + query : ''}`);
  }

  // ============================================================================
  // Tax Rules
  // ============================================================================

  async getTaxRules(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/tax-rules${query ? '?' + query : ''}`);
  }

  async getTaxRule(id: string) {
    return this.client.get(`/paylinq/tax-rules/${id}`);
  }

  async createTaxRule(data: any) {
    return this.client.post('/paylinq/tax-rules', data);
  }

  async updateTaxRule(id: string, data: any) {
    return this.client.put(`/paylinq/tax-rules/${id}`, data);
  }

  async deleteTaxRule(id: string) {
    return this.client.delete(`/paylinq/tax-rules/${id}`);
  }

  async validateTaxRule(data: any) {
    return this.client.post('/paylinq/tax-rules/validate', data);
  }

  // ============================================================================
  // Payroll Runs
  // ============================================================================

  async getPayrollRuns(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/payroll-runs${query ? '?' + query : ''}`);
  }

  async getPayrollRun(id: string) {
    return this.client.get(`/paylinq/payroll-runs/${id}`);
  }

  async createPayrollRun(data: any) {
    return this.client.post('/paylinq/payroll-runs', data);
  }

  async updatePayrollRun(id: string, data: any) {
    return this.client.put(`/paylinq/payroll-runs/${id}`, data);
  }

  async processPayrollRun(id: string) {
    return this.client.post(`/paylinq/payroll-runs/${id}/process`);
  }

  async approvePayrollRun(id: string) {
    return this.client.post(`/paylinq/payroll-runs/${id}/approve`);
  }

  async cancelPayrollRun(id: string) {
    return this.client.post(`/paylinq/payroll-runs/${id}/cancel`);
  }

  async getPayrollRunSummary(id: string) {
    return this.client.get(`/paylinq/payroll-runs/${id}/summary`);
  }

  // ============================================================================
  // Payslips
  // ============================================================================

  async getPayslips(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/payslips${query ? '?' + query : ''}`);
  }

  async getPayslip(id: string) {
    return this.client.get(`/paylinq/payslips/${id}`);
  }

  async generatePayslips(payrollRunId: string) {
    return this.client.post(`/paylinq/payslips/generate`, { payrollRunId });
  }

  async downloadPayslip(id: string) {
    return this.client.get(`/paylinq/payslips/${id}/download`, {
      responseType: 'blob',
    });
  }

  async emailPayslip(id: string) {
    return this.client.post(`/paylinq/payslips/${id}/email`);
  }

  // ============================================================================
  // Time & Attendance
  // ============================================================================

  async getTimeEntries(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/time-entries${query ? '?' + query : ''}`);
  }

  async getTimeEntry(id: string) {
    return this.client.get(`/paylinq/time-entries/${id}`);
  }

  async createTimeEntry(data: any) {
    return this.client.post('/paylinq/time-entries', data);
  }

  async updateTimeEntry(id: string, data: any) {
    return this.client.put(`/paylinq/time-entries/${id}`, data);
  }

  async deleteTimeEntry(id: string) {
    return this.client.delete(`/paylinq/time-entries/${id}`);
  }

  async approveTimeEntry(id: string) {
    return this.client.post(`/paylinq/time-entries/${id}/approve`);
  }

  async rejectTimeEntry(id: string, reason: string) {
    return this.client.post(`/paylinq/time-entries/${id}/reject`, { reason });
  }

  async bulkApproveTimeEntries(ids: string[]) {
    return this.client.post('/paylinq/time-entries/bulk-approve', { ids });
  }

  // ============================================================================
  // Scheduling
  // ============================================================================

  async getShifts(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/shifts${query ? '?' + query : ''}`);
  }

  async getShift(id: string) {
    return this.client.get(`/paylinq/shifts/${id}`);
  }

  async createShift(data: any) {
    return this.client.post('/paylinq/shifts', data);
  }

  async updateShift(id: string, data: any) {
    return this.client.put(`/paylinq/shifts/${id}`, data);
  }

  async deleteShift(id: string) {
    return this.client.delete(`/paylinq/shifts/${id}`);
  }

  async assignShift(id: string, workerId: string) {
    return this.client.post(`/paylinq/shifts/${id}/assign`, { workerId });
  }

  async unassignShift(id: string) {
    return this.client.post(`/paylinq/shifts/${id}/unassign`);
  }

  async getSchedule(startDate: string, endDate: string, filters: Record<string, any> = {}) {
    const params = new URLSearchParams({ startDate, endDate, ...filters });
    return this.client.get(`/paylinq/schedule?${params.toString()}`);
  }

  // ============================================================================
  // Dashboard & Reports
  // ============================================================================

  async getDashboard() {
    return this.client.get('/paylinq/dashboard');
  }

  async getPayrollSummary(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/reports/payroll-summary${query ? '?' + query : ''}`);
  }

  async getTaxSummary(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/reports/tax-summary${query ? '?' + query : ''}`);
  }

  async getWorkerCostReport(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/reports/worker-costs${query ? '?' + query : ''}`);
  }

  async exportReport(reportType: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/paylinq/reports/${reportType}/export${query ? '?' + query : ''}`, {
      responseType: 'blob',
    });
  }
}
