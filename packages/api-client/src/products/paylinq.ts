import { APIClient } from '../core/client';
import type {
  // Common
  PaginationParams,
  ApiResponse,
  PaginatedResponse,
  BulkOperationResponse,
  // Worker Types
  WorkerTypeTemplate,
  WorkerTypeAssignment,
  CreateWorkerTypeTemplateRequest,
  UpdateWorkerTypeTemplateRequest,
  CreateWorkerTypeAssignmentRequest,
  UpdateWorkerTypeAssignmentRequest,
  WorkerTypeUpgradeStatusResponse,
  WorkerTypeUpgradePreviewResponse,
  TemplateComparisonResponse,
  UpgradeWorkersRequest,
  UpgradeWorkersResponse,
  // Compensation
  Compensation,
  CreateCompensationRequest,
  UpdateCompensationRequest,
  CompensationHistoryEntry,
  CompensationSummary,
  CompensationFilters,
  // Deductions
  EmployeeDeduction,
  CreateDeductionRequest,
  UpdateDeductionRequest,
  DeductionSummary,
  DeductionFilters,
  BulkDeductionOperation,
  BulkDeductionResult,
  // Timesheets
  ShiftType,
  TimeAttendanceEvent,
  TimeEntry,
  Timesheet,
  CreateShiftTypeRequest,
  UpdateShiftTypeRequest,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  SubmitTimesheetRequest,
  TimesheetApprovalRequest,
  TimeEntryFilters,
  TimesheetFilters,
  HoursSummary,
  // Formulas
  PayComponentResponse,
  PayComponentsListResponse,
  ComponentFormula,
  CreatePayComponentRequest,
  UpdatePayComponentRequest,
  CreateFormulaRequest,
  UpdateFormulaRequest,
  FormulaValidationResult,
  PayComponentFilters,
  // Employee Components
  EmployeePayComponentAssignment,
  CreateEmployeeComponentAssignmentRequest,
  UpdateEmployeeComponentAssignmentRequest,
  EmployeeComponentFilters,
  // Payments
  PayrollRun,
  PayrollRunResponse,
  Paycheck,
  CreatePayrollRunRequest,
  UpdatePayrollRunRequest,
  CalculatePayrollRequest,
  ApprovePayrollRequest,
  ProcessPayrollRequest,
  VoidPaycheckRequest,
  PayrollRunFilters,
  PaycheckFilters,
  PayrollSummary,
  PaycheckHistory,
  PayrollCalculationResult,
  // Reconciliation
  PaymentTransaction,
  Reconciliation,
  CreatePaymentTransactionRequest,
  UpdatePaymentTransactionRequest,
  ProcessPaymentRequest,
  RetryPaymentRequest,
  CreateReconciliationRequest,
  UpdateReconciliationRequest,
  CompleteReconciliationRequest,
  PaymentTransactionFilters,
  ReconciliationFilters,
  PaymentSummary,
  ReconciliationSummary,
  BulkPaymentProcessingResult,
  // Reports
  ReportRequest,
  ReportGenerationResult,
  ExportRequest,
  PayrollSummaryReport,
  EmployeeEarningsReport,
  TaxLiabilityReport,
  DeductionsSummaryReport,
  TimeAttendanceReport,
  LaborCostReport,
  AnalyticsDashboard,
  YearToDateSummary,
} from '@recruitiq/types';

/**
 * Paylinq Product API
 * Payroll management system endpoints
 * 
 * Complete API client for all 19 Paylinq modules with 149 endpoints
 * 
 * ARCHITECTURE: basePath is relative to APIClient's baseURL ('/api')
 * Final URLs: /api + /products/paylinq/* = /api/products/paylinq/*
 */
export class PaylinqClient {
  private readonly basePath = 'products/paylinq';

  constructor(private client: APIClient) {}

  // ============================================================================
  // Worker Type Templates
  // ============================================================================

  /**
   * Get all worker type templates
   */
  async getWorkerTypeTemplates(params?: PaginationParams & { status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-types${query ? '?' + query : ''}`
    );
  }

  /**
   * Get worker type template by ID
   */
  async getWorkerTypeTemplate(id: string) {
    return this.client.get<ApiResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-types/${id}`
    );
  }

  /**
   * Create worker type template
   */
  async createWorkerTypeTemplate(data: CreateWorkerTypeTemplateRequest) {
    return this.client.post<ApiResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-types`,
      data
    );
  }

  /**
   * Update worker type template
   */
  async updateWorkerTypeTemplate(id: string, data: UpdateWorkerTypeTemplateRequest) {
    return this.client.put<ApiResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-types/${id}`,
      data
    );
  }

  /**
   * Delete worker type template
   */
  async deleteWorkerTypeTemplate(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/worker-types/${id}`
    );
  }

  // ============================================================================
  // Worker Type Assignments
  // ============================================================================

  /**
   * Get worker type assignments for an employee
   */
  async getEmployeeWorkerTypes(employeeId: string) {
    return this.client.get<ApiResponse<WorkerTypeAssignment[]>>(
      `${this.basePath}/worker-types/employee/${employeeId}`
    );
  }

  /**
   * Get current worker type assignment for an employee
   */
  async getCurrentWorkerType(employeeId: string) {
    return this.client.get<ApiResponse<WorkerTypeAssignment>>(
      `${this.basePath}/worker-types/employee/${employeeId}/current`
    );
  }

  /**
   * Get worker type assignment history for an employee
   */
  async getWorkerTypeHistory(employeeId: string) {
    return this.client.get<ApiResponse<WorkerTypeAssignment[]>>(
      `${this.basePath}/worker-types/employee/${employeeId}/history`
    );
  }

  /**
   * Assign worker type to employee
   */
  async assignWorkerType(data: CreateWorkerTypeAssignmentRequest) {
    return this.client.post<ApiResponse<WorkerTypeAssignment>>(
      `${this.basePath}/worker-types/assign`,
      data
    );
  }

  /**
   * Update worker type assignment
   */
  async updateWorkerTypeAssignment(id: string, data: UpdateWorkerTypeAssignmentRequest) {
    return this.client.put<ApiResponse<WorkerTypeAssignment>>(
      `${this.basePath}/worker-types/${id}`,
      data
    );
  }

  /**
   * Terminate worker type assignment
   */
  async terminateWorkerTypeAssignment(id: string, effectiveTo: string) {
    return this.client.post<ApiResponse<WorkerTypeAssignment>>(
      `${this.basePath}/worker-types/${id}/terminate`,
      { effectiveTo }
    );
  }

  // ============================================================================
  // Worker Type Template Upgrades
  // ============================================================================

  /**
   * Get upgrade status for a worker type template
   * Shows which workers need to be upgraded to the latest template version
   */
  async getWorkerTypeUpgradeStatus(workerTypeId: string) {
    return this.client.get<WorkerTypeUpgradeStatusResponse>(
      `${this.basePath}/worker-types/${workerTypeId}/upgrade-status`
    );
  }

  /**
   * Preview template upgrade
   * Shows what will change when upgrading workers to the latest template
   */
  async previewWorkerTypeUpgrade(workerTypeId: string) {
    return this.client.get<WorkerTypeUpgradePreviewResponse>(
      `${this.basePath}/worker-types/${workerTypeId}/preview-upgrade`
    );
  }

  /**
   * Upgrade workers to latest template version
   * @param workerTypeId - Worker type template ID
   * @param data - Upgrade options (workerIds, effectiveDate)
   */
  async upgradeWorkersToTemplate(workerTypeId: string, data: UpgradeWorkersRequest) {
    return this.client.post<UpgradeWorkersResponse>(
      `${this.basePath}/worker-types/${workerTypeId}/upgrade-workers`,
      data
    );
  }

  /**
   * Compare two pay structure templates
   * Shows differences between template versions
   */
  async compareTemplates(fromTemplateCode: string, toTemplateCode: string) {
    return this.client.get<TemplateComparisonResponse>(
      `${this.basePath}/templates/compare?from=${fromTemplateCode}&to=${toTemplateCode}`
    );
  }

  // ============================================================================
  // Compensation
  // ============================================================================

  /**
   * Get compensation records
   */
  async getCompensation(params?: CompensationFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<Compensation>>(
      `${this.basePath}/compensation${query ? '?' + query : ''}`
    );
  }

  /**
   * Get compensation by ID
   */
  async getCompensationById(id: string) {
    return this.client.get<ApiResponse<Compensation>>(
      `${this.basePath}/compensation/${id}`
    );
  }

  /**
   * Get employee compensation records
   */
  async getEmployeeCompensation(employeeId: string) {
    return this.client.get<ApiResponse<Compensation[]>>(
      `${this.basePath}/compensation/employee/${employeeId}`
    );
  }

  /**
   * Get current employee compensation
   */
  async getCurrentCompensation(employeeId: string) {
    return this.client.get<ApiResponse<Compensation>>(
      `${this.basePath}/compensation/employee/${employeeId}/current`
    );
  }

  /**
   * Get compensation history for employee
   */
  async getCompensationHistory(employeeId: string) {
    return this.client.get<ApiResponse<CompensationHistoryEntry[]>>(
      `${this.basePath}/compensation/employee/${employeeId}/history`
    );
  }

  /**
   * Get compensation summary for employee
   */
  async getCompensationSummary(employeeId: string) {
    return this.client.get<ApiResponse<CompensationSummary>>(
      `${this.basePath}/compensation/employee/${employeeId}/summary`
    );
  }

  /**
   * Create compensation record
   */
  async createCompensation(data: CreateCompensationRequest) {
    return this.client.post<ApiResponse<Compensation>>(
      `${this.basePath}/compensation`,
      data
    );
  }

  /**
   * Update compensation record
   */
  async updateCompensation(id: string, data: UpdateCompensationRequest) {
    return this.client.put<ApiResponse<Compensation>>(
      `${this.basePath}/compensation/${id}`,
      data
    );
  }

  /**
   * Delete compensation record
   */
  async deleteCompensation(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/compensation/${id}`
    );
  }

  // ============================================================================
  // Deductions
  // ============================================================================

  /**
   * Get deductions
   */
  async getDeductions(params?: DeductionFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<EmployeeDeduction>>(
      `${this.basePath}/deductions${query ? '?' + query : ''}`
    );
  }

  /**
   * Get deduction by ID
   */
  async getDeduction(id: string) {
    return this.client.get<ApiResponse<EmployeeDeduction>>(
      `${this.basePath}/deductions/${id}`
    );
  }

  /**
   * Get employee deductions
   */
  async getEmployeeDeductions(employeeId: string) {
    return this.client.get<ApiResponse<EmployeeDeduction[]>>(
      `${this.basePath}/deductions/employee/${employeeId}`
    );
  }

  /**
   * Get active employee deductions
   */
  async getActiveDeductions(employeeId: string) {
    return this.client.get<ApiResponse<EmployeeDeduction[]>>(
      `${this.basePath}/deductions/employee/${employeeId}/active`
    );
  }

  /**
   * Get deduction summary for employee
   */
  async getDeductionSummary(employeeId: string) {
    return this.client.get<ApiResponse<DeductionSummary>>(
      `${this.basePath}/deductions/employee/${employeeId}/summary`
    );
  }

  /**
   * Create deduction
   */
  async createDeduction(data: CreateDeductionRequest) {
    return this.client.post<ApiResponse<EmployeeDeduction>>(
      `${this.basePath}/deductions`,
      data
    );
  }

  /**
   * Update deduction
   */
  async updateDeduction(id: string, data: UpdateDeductionRequest) {
    return this.client.put<ApiResponse<EmployeeDeduction>>(
      `${this.basePath}/deductions/${id}`,
      data
    );
  }

  /**
   * Delete deduction
   */
  async deleteDeduction(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/deductions/${id}`
    );
  }

  /**
   * Bulk deduction operations
   */
  async bulkDeductionOperation(operation: BulkDeductionOperation) {
    return this.client.post<BulkDeductionResult>(
      `${this.basePath}/deductions/bulk`,
      operation
    );
  }

  // ============================================================================
  // Shift Types
  // ============================================================================

  /**
   * Get shift types
   */
  async getShiftTypes(params?: PaginationParams & { status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<ShiftType>>(
      `${this.basePath}/time-attendance/shift-types${query ? '?' + query : ''}`
    );
  }

  /**
   * Get shift type by ID
   */
  async getShiftType(id: string) {
    return this.client.get<ApiResponse<ShiftType>>(
      `${this.basePath}/time-attendance/shift-types/${id}`
    );
  }

  /**
   * Create shift type
   */
  async createShiftType(data: CreateShiftTypeRequest) {
    return this.client.post<ApiResponse<ShiftType>>(
      `${this.basePath}/time-attendance/shift-types`,
      data
    );
  }

  /**
   * Update shift type
   */
  async updateShiftType(id: string, data: UpdateShiftTypeRequest) {
    return this.client.put<ApiResponse<ShiftType>>(
      `${this.basePath}/time-attendance/shift-types/${id}`,
      data
    );
  }

  /**
   * Delete shift type
   */
  async deleteShiftType(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/time-attendance/shift-types/${id}`
    );
  }

  // ============================================================================
  // Time Attendance Events
  // ============================================================================

  /**
   * Clock in
   */
  async clockIn(employeeId: string, data?: { locationId?: string; gpsLatitude?: number; gpsLongitude?: number }) {
    return this.client.post<ApiResponse<TimeAttendanceEvent>>(
      `${this.basePath}/time-attendance/clock-in`,
      { employeeId, ...data }
    );
  }

  /**
   * Clock out
   */
  async clockOut(employeeId: string, data?: { locationId?: string; gpsLatitude?: number; gpsLongitude?: number }) {
    return this.client.post<ApiResponse<TimeAttendanceEvent>>(
      `${this.basePath}/time-attendance/clock-out`,
      { employeeId, ...data }
    );
  }

  /**
   * Break start
   */
  async breakStart(employeeId: string) {
    return this.client.post<ApiResponse<TimeAttendanceEvent>>(
      `${this.basePath}/time-attendance/break-start`,
      { employeeId }
    );
  }

  /**
   * Break end
   */
  async breakEnd(employeeId: string) {
    return this.client.post<ApiResponse<TimeAttendanceEvent>>(
      `${this.basePath}/time-attendance/break-end`,
      { employeeId }
    );
  }

  /**
   * Get time attendance events
   */
  async getTimeAttendanceEvents(params?: { employeeId?: string; startDate?: string; endDate?: string } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<TimeAttendanceEvent>>(
      `${this.basePath}/time-attendance/events${query ? '?' + query : ''}`
    );
  }

  // ============================================================================
  // Time Entries
  // ============================================================================

  /**
   * Get time entries
   */
  async getTimeEntries(params?: TimeEntryFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<TimeEntry>>(
      `${this.basePath}/time-attendance/time-entries${query ? '?' + query : ''}`
    );
  }

  /**
   * Get time entry by ID
   */
  async getTimeEntry(id: string) {
    return this.client.get<ApiResponse<TimeEntry>>(
      `${this.basePath}/time-attendance/time-entries/${id}`
    );
  }

  /**
   * Create time entry
   */
  async createTimeEntry(data: CreateTimeEntryRequest) {
    return this.client.post<ApiResponse<TimeEntry>>(
      `${this.basePath}/time-attendance/time-entries`,
      data
    );
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(id: string, data: UpdateTimeEntryRequest) {
    return this.client.put<ApiResponse<TimeEntry>>(
      `${this.basePath}/time-attendance/time-entries/${id}`,
      data
    );
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/time-attendance/time-entries/${id}`
    );
  }

  /**
   * Approve time entry
   */
  async approveTimeEntry(id: string) {
    return this.client.post<ApiResponse<TimeEntry>>(
      `${this.basePath}/time-attendance/time-entries/${id}/approve`
    );
  }

  /**
   * Reject time entry
   */
  async rejectTimeEntry(id: string, reason: string) {
    return this.client.post<ApiResponse<TimeEntry>>(
      `${this.basePath}/time-attendance/time-entries/${id}/reject`,
      { reason }
    );
  }

  /**
   * Bulk approve time entries
   */
  async bulkApproveTimeEntries(ids: string[]) {
    return this.client.post<BulkOperationResponse>(
      `${this.basePath}/time-attendance/time-entries/bulk-approve`,
      { ids }
    );
  }

  // ============================================================================
  // Timesheets
  // ============================================================================

  /**
   * Get timesheets
   */
  async getTimesheets(params?: TimesheetFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<Timesheet>>(
      `${this.basePath}/timesheets${query ? '?' + query : ''}`
    );
  }

  /**
   * Get timesheet by ID
   */
  async getTimesheet(id: string) {
    return this.client.get<ApiResponse<Timesheet>>(
      `${this.basePath}/timesheets/${id}`
    );
  }

  /**
   * Get employee timesheets
   */
  async getEmployeeTimesheets(employeeId: string) {
    return this.client.get<ApiResponse<Timesheet[]>>(
      `${this.basePath}/timesheets/employee/${employeeId}`
    );
  }

  /**
   * Submit timesheet
   */
  async submitTimesheet(data: SubmitTimesheetRequest) {
    return this.client.post<ApiResponse<Timesheet>>(
      `${this.basePath}/timesheets/submit`,
      data
    );
  }

  /**
   * Approve/Reject timesheet
   */
  async approveRejectTimesheet(id: string, data: TimesheetApprovalRequest) {
    return this.client.post<ApiResponse<Timesheet>>(
      `${this.basePath}/timesheets/${id}/review`,
      data
    );
  }

  /**
   * Get hours summary
   */
  async getHoursSummary(employeeId: string, periodStart: string, periodEnd: string) {
    return this.client.get<ApiResponse<HoursSummary>>(
      `${this.basePath}/timesheets/employee/${employeeId}/summary?periodStart=${periodStart}&periodEnd=${periodEnd}`
    );
  }

  // ============================================================================
  // Pay Components
  // ============================================================================

  /**
   * Get pay components
   * Returns: { success: true, payComponents: [...], count: number }
   */
  async getPayComponents(params?: PayComponentFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PayComponentsListResponse>(
      `${this.basePath}/pay-components${query ? '?' + query : ''}`
    );
  }

  /**
   * Get pay component by ID
   * Returns: { success: true, payComponent: {...} }
   */
  async getPayComponent(id: string) {
    return this.client.get<PayComponentResponse>(
      `${this.basePath}/pay-components/${id}`
    );
  }

  /**
   * Create pay component
   * Returns: { success: true, payComponent: {...}, message: string }
   */
  async createPayComponent(data: CreatePayComponentRequest) {
    return this.client.post<PayComponentResponse>(
      `${this.basePath}/pay-components`,
      data
    );
  }

  /**
   * Update pay component
   * Returns: { success: true, payComponent: {...}, message: string }
   */
  async updatePayComponent(id: string, data: UpdatePayComponentRequest) {
    return this.client.put<PayComponentResponse>(
      `${this.basePath}/pay-components/${id}`,
      data
    );
  }

  /**
   * Delete pay component
   */
  async deletePayComponent(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/pay-components/${id}`
    );
  }

  // ============================================================================
  // Component Formulas
  // ============================================================================

  /**
   * Get formulas
   */
  async getFormulas(params?: { payComponentId?: string } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<ComponentFormula>>(
      `${this.basePath}/formulas${query ? '?' + query : ''}`
    );
  }

  /**
   * Get formula by ID
   */
  async getFormula(id: string) {
    return this.client.get<ApiResponse<ComponentFormula>>(
      `${this.basePath}/formulas/${id}`
    );
  }

  /**
   * Create formula
   */
  async createFormula(data: CreateFormulaRequest) {
    return this.client.post<ApiResponse<ComponentFormula>>(
      `${this.basePath}/formulas`,
      data
    );
  }

  /**
   * Update formula
   */
  async updateFormula(id: string, data: UpdateFormulaRequest) {
    return this.client.put<ApiResponse<ComponentFormula>>(
      `${this.basePath}/formulas/${id}`,
      data
    );
  }

  /**
   * Delete formula
   */
  async deleteFormula(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/formulas/${id}`
    );
  }

  /**
   * Validate formula
   */
  async validateFormula(formulaExpression: string, variables: Record<string, any>) {
    return this.client.post<FormulaValidationResult>(
      `${this.basePath}/formulas/validate`,
      { formulaExpression, variables }
    );
  }

  // ============================================================================
  // Custom Pay Components
  // ============================================================================
  // Payroll Runs
  // ============================================================================

  /**
   * Get payroll runs
   */
  async getPayrollRuns(params?: PayrollRunFilters & PaginationParams) {
    // Filter out undefined values to prevent "status=undefined" in query string
    const filteredParams = Object.fromEntries(
      Object.entries(params || {}).filter(([_, value]) => value !== undefined && value !== null)
    );
    const query = new URLSearchParams(filteredParams as Record<string, string>).toString();
    return this.client.get<PaginatedResponse<PayrollRun>>(
      `${this.basePath}/payroll-runs${query ? '?' + query : ''}`
    );
  }

  /**
   * Get payroll run by ID
   */
  async getPayrollRun(id: string) {
    return this.client.get<PayrollRunResponse>(
      `${this.basePath}/payroll-runs/${id}`
    );
  }

  /**
   * Create payroll run
   */
  async createPayrollRun(data: CreatePayrollRunRequest) {
    return this.client.post<ApiResponse<PayrollRun>>(
      `${this.basePath}/payroll-runs`,
      data
    );
  }

  /**
   * Update payroll run
   */
  async updatePayrollRun(id: string, data: UpdatePayrollRunRequest) {
    return this.client.put<ApiResponse<PayrollRun>>(
      `${this.basePath}/payroll-runs/${id}`,
      data
    );
  }

  /**
   * Calculate payroll
   */
  async calculatePayroll(data: CalculatePayrollRequest) {
    return this.client.post<PayrollCalculationResult>(
      `${this.basePath}/payroll-runs/${data.payrollRunId}/calculate`,
      data
    );
  }

  /**
   * Mark payroll run for review (calculating -> calculated)
   */
  async markPayrollRunForReview(payrollRunId: string) {
    return this.client.post<PayrollRunResponse>(
      `${this.basePath}/payroll-runs/${payrollRunId}/mark-for-review`
    );
  }

  /**
   * Approve payroll run
   */
  async approvePayrollRun(data: ApprovePayrollRequest) {
    return this.client.post<PayrollRunResponse>(
      `${this.basePath}/payroll-runs/${data.payrollRunId}/approve`,
      data
    );
  }

  /**
   * Process payroll run
   */
  async processPayrollRun(data: ProcessPayrollRequest) {
    return this.client.post<PayrollRunResponse>(
      `${this.basePath}/payroll-runs/${data.payrollRunId}/process`,
      data
    );
  }

  /**
   * Cancel payroll run
   */
  async cancelPayrollRun(id: string) {
    return this.client.post<PayrollRunResponse>(
      `${this.basePath}/payroll-runs/${id}/cancel`
    );
  }

  /**
   * Send payslips to employees
   */
  async sendPayslips(id: string) {
    return this.client.post<ApiResponse<{ payrollRunId: string; employeeCount: number; status: string }>>(
      `${this.basePath}/payroll-runs/${id}/send-payslips`
    );
  }

  /**
   * Get payroll run summary
   */
  async getPayrollRunSummary(id: string) {
    return this.client.get<ApiResponse<PayrollSummary>>(
      `${this.basePath}/payroll-runs/${id}/summary`
    );
  }

  // ============================================================================
  // Paychecks
  // ============================================================================

  /**
   * Get paychecks
   */
  async getPaychecks(params?: PaycheckFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<Paycheck>>(
      `${this.basePath}/paychecks${query ? '?' + query : ''}`
    );
  }

  /**
   * Get paycheck by ID
   */
  async getPaycheck(id: string) {
    return this.client.get<ApiResponse<Paycheck>>(
      `${this.basePath}/paychecks/${id}`
    );
  }

  /**
   * Get employee paychecks
   */
  async getEmployeePaychecks(employeeId: string, params?: PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<ApiResponse<Paycheck[]>>(
      `${this.basePath}/paychecks/employee/${employeeId}${query ? '?' + query : ''}`
    );
  }

  /**
   * Get paycheck history for employee
   */
  async getPaycheckHistory(employeeId: string) {
    return this.client.get<ApiResponse<PaycheckHistory>>(
      `${this.basePath}/paychecks/employee/${employeeId}/history`
    );
  }

  /**
   * Update paycheck
   */
  async updatePaycheck(id: string, data: any) {
    return this.client.put<ApiResponse<Paycheck>>(
      `${this.basePath}/paychecks/${id}`,
      data
    );
  }

  /**
   * Void paycheck
   */
  async voidPaycheck(data: VoidPaycheckRequest) {
    return this.client.post<ApiResponse<Paycheck>>(
      `${this.basePath}/paychecks/${data.paycheckId}/void`,
      data
    );
  }

  /**
   * Reissue paycheck
   */
  async reissuePaycheck(id: string, data: any) {
    return this.client.post<ApiResponse<Paycheck>>(
      `${this.basePath}/paychecks/${id}/reissue`,
      data
    );
  }

  /**
   * Delete paycheck
   */
  async deletePaycheck(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/paychecks/${id}`
    );
  }

  /**
   * Download payslip PDF
   */
  async downloadPayslipPdf(id: string) {
    try {
      // Use fetch directly for blob downloads to avoid axios response transformation issues
      const baseUrl = this.client.getClient().defaults.baseURL || '/api';
      const url = `${baseUrl}/${this.basePath}/paychecks/${id}/pdf`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      console.log('[PaylinqClient] PDF downloaded via fetch:', {
        status: response.status,
        blobSize: blob.size,
        blobType: blob.type,
        isBlob: blob instanceof Blob
      });
      
      // Return in axios-like format for compatibility
      return {
        data: blob,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      console.error('[PaylinqClient] PDF download error:', error);
      throw error;
    }
  }

  /**
   * Send individual payslip via email
   */
  async sendPayslip(id: string) {
    return this.client.post<ApiResponse<{ paycheckId: string; sentTo: string; sentAt: string }>>(
      `${this.basePath}/paychecks/${id}/send`
    );
  }

  /**
   * Get paycheck components breakdown (Phase 2: Component-based tax calculation)
   */
  async getPaycheckComponents(paycheckId: string) {
    return this.client.get<any>(
      `${this.basePath}/paychecks/${paycheckId}/components`
    );
  }

  // Legacy aliases for backwards compatibility
  async getPayslips(params: Record<string, any> = {}) {
    return this.getPaychecks(params);
  }

  async getPayslip(id: string) {
    return this.getPaycheck(id);
  }

  // ============================================================================
  // Payment Transactions
  // ============================================================================

  /**
   * Get payment transactions
   */
  async getPaymentTransactions(params?: PaymentTransactionFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<PaginatedResponse<PaymentTransaction>>(
      `${this.basePath}/payment-transactions${query ? '?' + query : ''}`
    );
  }

  /**
   * Get payment transaction by ID
   */
  async getPaymentTransaction(id: string) {
    return this.client.get<ApiResponse<PaymentTransaction>>(
      `${this.basePath}/payment-transactions/${id}`
    );
  }

  /**
   * Create payment transaction
   */
  async createPaymentTransaction(data: CreatePaymentTransactionRequest) {
    return this.client.post<ApiResponse<PaymentTransaction>>(
      `${this.basePath}/payment-transactions`,
      data
    );
  }

  /**
   * Update payment transaction
   */
  async updatePaymentTransaction(id: string, data: UpdatePaymentTransactionRequest) {
    return this.client.put<ApiResponse<PaymentTransaction>>(
      `${this.basePath}/payment-transactions/${id}`,
      data
    );
  }

  /**
   * Process payment
   */
  async processPayment(data: ProcessPaymentRequest) {
    return this.client.post<ApiResponse<PaymentTransaction>>(
      `${this.basePath}/payment-transactions/${data.transactionId}/process`,
      data
    );
  }

  /**
   * Retry payment
   */
  async retryPayment(data: RetryPaymentRequest) {
    return this.client.post<ApiResponse<PaymentTransaction>>(
      `${this.basePath}/payment-transactions/${data.transactionId}/retry`,
      data
    );
  }

  /**
   * Get payment summary
   */
  async getPaymentSummary(payrollRunId: string) {
    return this.client.get<ApiResponse<PaymentSummary>>(
      `${this.basePath}/payment-transactions/payroll-run/${payrollRunId}/summary`
    );
  }

  /**
   * Bulk process payments
   */
  async bulkProcessPayments(transactionIds: string[]) {
    return this.client.post<BulkPaymentProcessingResult>(
      `${this.basePath}/payment-transactions/bulk-process`,
      { transactionIds }
    );
  }

  // ============================================================================
  // Reconciliation
  // ============================================================================

  /**
   * Get reconciliations
   */
  async getReconciliations(params?: ReconciliationFilters & PaginationParams) {
    // Filter out undefined values before creating URLSearchParams
    const filteredParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const query = new URLSearchParams(filteredParams as any).toString();
    return this.client.get<PaginatedResponse<Reconciliation>>(
      `${this.basePath}/reconciliations${query ? '?' + query : ''}`
    );
  }

  /**
   * Get reconciliation by ID
   */
  async getReconciliation(id: string) {
    return this.client.get<ApiResponse<Reconciliation>>(
      `${this.basePath}/reconciliations/${id}`
    );
  }

  /**
   * Create reconciliation
   */
  async createReconciliation(data: CreateReconciliationRequest) {
    return this.client.post<ApiResponse<Reconciliation>>(
      `${this.basePath}/reconciliations`,
      data
    );
  }

  /**
   * Update reconciliation
   */
  async updateReconciliation(id: string, data: UpdateReconciliationRequest) {
    return this.client.put<ApiResponse<Reconciliation>>(
      `${this.basePath}/reconciliations/${id}`,
      data
    );
  }

  /**
   * Delete reconciliation
   */
  async deleteReconciliation(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/reconciliations/${id}`
    );
  }

  /**
   * Complete reconciliation
   */
  async completeReconciliation(data: CompleteReconciliationRequest) {
    return this.client.post<ApiResponse<Reconciliation>>(
      `${this.basePath}/reconciliations/${data.reconciliationId}/complete`,
      data
    );
  }

  /**
   * Get reconciliation items
   */
  async getReconciliationItems(reconciliationId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.client.get<ApiResponse<any[]>>(
      `${this.basePath}/reconciliations/${reconciliationId}/items${query}`
    );
  }

  /**
   * Add reconciliation item
   */
  async addReconciliationItem(reconciliationId: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/reconciliations/${reconciliationId}/items`,
      data
    );
  }

  /**
   * Update reconciliation item
   */
  async updateReconciliationItem(itemId: string, data: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/reconciliations/items/${itemId}`,
      data
    );
  }

  /**
   * Resolve reconciliation item
   */
  async resolveReconciliationItem(itemId: string, data: { resolution: string }) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/reconciliations/items/${itemId}/resolve`,
      data
    );
  }

  /**
   * Get reconciliation summary
   */
  async getReconciliationSummary(payrollRunId: string, reconciliationType: string) {
    return this.client.get<ApiResponse<ReconciliationSummary>>(
      `${this.basePath}/reconciliations/payroll-run/${payrollRunId}/summary?type=${reconciliationType}`
    );
  }

  // ============================================================================
  // Reports
  // ============================================================================

  /**
   * Generate report
   */
  async generateReport(data: ReportRequest) {
    return this.client.post<ReportGenerationResult>(
      `${this.basePath}/reports/generate`,
      data
    );
  }

  /**
   * Get report status
   */
  async getReportStatus(reportId: string) {
    return this.client.get<ReportGenerationResult>(
      `${this.basePath}/reports/${reportId}/status`
    );
  }

  /**
   * Download report
   */
  async downloadReport(reportId: string) {
    return this.client.get(
      `${this.basePath}/reports/${reportId}/download`,
      { responseType: 'blob' }
    );
  }

  /**
   * Get payroll summary report
   */
  async getPayrollSummary(params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<PayrollSummaryReport>>(
      `${this.basePath}/reports/payroll-summary${query ? '?' + query : ''}`
    );
  }

  /**
   * Get employee earnings report
   */
  async getEmployeeEarningsReport(employeeId: string, params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<EmployeeEarningsReport>>(
      `${this.basePath}/reports/employee-earnings/${employeeId}${query ? '?' + query : ''}`
    );
  }

  /**
   * Get tax liability report
   */
  async getTaxLiabilityReport(params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<TaxLiabilityReport>>(
      `${this.basePath}/reports/tax-liability${query ? '?' + query : ''}`
    );
  }

  /**
   * Get deductions summary report
   */
  async getDeductionsSummaryReport(params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<DeductionsSummaryReport>>(
      `${this.basePath}/reports/deductions-summary${query ? '?' + query : ''}`
    );
  }

  /**
   * Get time attendance report
   */
  async getTimeAttendanceReport(params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<TimeAttendanceReport>>(
      `${this.basePath}/reports/time-attendance${query ? '?' + query : ''}`
    );
  }

  /**
   * Get labor cost report
   */
  async getLaborCostReport(params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<LaborCostReport>>(
      `${this.basePath}/reports/labor-cost${query ? '?' + query : ''}`
    );
  }

  /**
   * Get analytics dashboard
   */
  async getAnalyticsDashboard(params: { periodStart: string; periodEnd: string }) {
    const query = new URLSearchParams(params).toString();
    return this.client.get<ApiResponse<AnalyticsDashboard>>(
      `${this.basePath}/reports/analytics-dashboard${query ? '?' + query : ''}`
    );
  }

  /**
   * Get year-to-date summary
   */
  async getYearToDateSummary(employeeId: string, year: number) {
    return this.client.get<ApiResponse<YearToDateSummary>>(
      `${this.basePath}/reports/ytd-summary/${employeeId}?year=${year}`
    );
  }

  /**
   * Export data
   */
  async exportData(data: ExportRequest) {
    return this.client.post(
      `${this.basePath}/reports/export`,
      data,
      { responseType: 'blob' }
    );
  }

  // ============================================================================
  // Dashboard & Settings
  // ============================================================================

  /**
   * Get dashboard data
   */
  async getDashboard() {
    const url = `${this.basePath}/dashboard`;
    console.log('[PaylinqClient] getDashboard called:', {
      basePath: this.basePath,
      fullURL: url,
      clientBaseURL: this.client.getClient().defaults.baseURL,
      finalURL: `${this.client.getClient().defaults.baseURL}/${url}`
    });
    return this.client.get(url);
  }

  /**
   * Get settings
   */
  async getSettings() {
    return this.client.get(`${this.basePath}/settings`);
  }

  /**
   * Update settings
   */
  async updateSettings(data: any) {
    return this.client.put(`${this.basePath}/settings`, data);
  }

  /**
   * Get company settings
   */
  async getCompanySettings() {
    return this.client.get(`${this.basePath}/settings/company`);
  }

  /**
   * Update company settings
   */
  async updateCompanySettings(data: any) {
    return this.client.put(`${this.basePath}/settings/company`, data);
  }

  /**
   * Get payroll settings
   */
  async getPayrollSettings() {
    return this.client.get(`${this.basePath}/settings/payroll`);
  }

  /**
   * Update payroll settings
   */
  async updatePayrollSettings(data: any) {
    return this.client.put(`${this.basePath}/settings/payroll`, data);
  }

  /**
   * Get tax rules (Surinamese tax configuration)
   */
  async getTaxRules(params?: { status?: string; type?: string } & PaginationParams) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return this.client.get(`${this.basePath}/settings/tax-rules${query ? '?' + query : ''}`);
  }

  /**
   * Get single tax rule by ID
   */
  async getTaxRule(id: string) {
    return this.client.get(`${this.basePath}/settings/tax-rules/${id}`);
  }

  /**
   * Create tax rule
   */
  async createTaxRule(data: any) {
    return this.client.post(`${this.basePath}/settings/tax-rules`, data);
  }

  /**
   * Update tax rule
   */
  async updateTaxRule(id: string, data: any) {
    return this.client.put(`${this.basePath}/settings/tax-rules/${id}`, data);
  }

  /**
   * Delete tax rule
   */
  async deleteTaxRule(id: string) {
    return this.client.delete(`${this.basePath}/settings/tax-rules/${id}`);
  }

  // ============================================================================
  // Pay Period Configuration
  // ============================================================================

  /**
   * Get pay period configuration
   */
  async getPayPeriodConfig() {
    return this.client.get(`${this.basePath}/settings/pay-period-config`);
  }

  /**
   * Save pay period configuration
   */
  async savePayPeriodConfig(data: any) {
    return this.client.put(`${this.basePath}/settings/pay-period-config`, data);
  }

  /**
   * Get current pay period
   */
  async getCurrentPayPeriod() {
    return this.client.get(`${this.basePath}/settings/pay-period/current`);
  }

  /**
   * Get next pay period
   */
  async getNextPayPeriod() {
    return this.client.get(`${this.basePath}/settings/pay-period/next`);
  }

  /**
   * Get company holidays
   */
  async getHolidays(year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.client.get(`${this.basePath}/settings/holidays${query}`);
  }

  /**
   * Create company holiday
   */
  async createHoliday(data: any) {
    return this.client.post(`${this.basePath}/settings/holidays`, data);
  }

  /**
   * Delete company holiday
   */
  async deleteHoliday(id: string) {
    return this.client.delete(`${this.basePath}/settings/holidays/${id}`);
  }

  // ============================================================================
  // Legacy/Additional Methods
  // ============================================================================

  /**
   * Get workers (legacy - for backward compatibility)
   */
  async getWorkers(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/workers${query ? '?' + query : ''}`);
  }

  /**
   * Get worker by ID (legacy)
   */
  async getWorker(id: string) {
    return this.client.get(`${this.basePath}/workers/${id}`);
  }

  /**
   * Create worker (legacy)
   */
  async createWorker(data: any) {
    return this.client.post(`${this.basePath}/workers`, data);
  }

  /**
   * Update worker (legacy)
   */
  async updateWorker(id: string, data: any) {
    return this.client.put(`${this.basePath}/workers/${id}`, data);
  }

  /**
   * Delete worker (legacy)
   */
  async deleteWorker(id: string) {
    return this.client.delete(`${this.basePath}/workers/${id}`);
  }

  /**
   * Get worker payslips (legacy)
   */
  async getWorkerPayslips(id: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/workers/${id}/payslips${query ? '?' + query : ''}`);
  }

  // ============================================================================
  // User Access Management
  // Grant and revoke system access to employees
  // ============================================================================

  /**
   * Grant system access to an employee
   * Creates a user account and links it to the employee
   */
  async grantEmployeeAccess(employeeId: string, data: {
    email?: string;
    password?: string;
    sendEmail?: boolean;
  }) {
    return this.client.post(`${this.basePath}/employees/${employeeId}/grant-access`, data);
  }

  /**
   * Get employee's user account status
   */
  async getEmployeeUserAccount(employeeId: string) {
    return this.client.get(`${this.basePath}/employees/${employeeId}/user-account`);
  }

  /**
   * Revoke system access from an employee
   */
  async revokeEmployeeAccess(employeeId: string) {
    return this.client.delete(`${this.basePath}/employees/${employeeId}/revoke-access`);
  }

  /**
   * Update employee's user access settings
   */
  async updateEmployeeAccess(employeeId: string, data: {
    email?: string;
    accountStatus?: string;
    isActive?: boolean;
    preferences?: Record<string, any>;
  }) {
    return this.client.patch(`${this.basePath}/employees/${employeeId}/user-access`, data);
  }

  /**
   * Get tax summary (legacy)
   */
  async getTaxSummary(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/reports/tax-summary${query ? '?' + query : ''}`);
  }

  /**
   * Get worker cost report (legacy)
   */
  async getWorkerCostReport(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/reports/worker-costs${query ? '?' + query : ''}`);
  }

  /**
   * Export report (legacy)
   */
  async exportReport(reportType: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/reports/${reportType}/export${query ? '?' + query : ''}`, {
      responseType: 'blob',
    });
  }

  // ============================================================================
  // Scheduling (existing methods)
  // ============================================================================

  /**
   * Get schedules
   */
  async getSchedules(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/schedules${query ? '?' + query : ''}`);
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(id: string) {
    return this.client.get(`${this.basePath}/schedules/${id}`);
  }

  /**
   * Create schedule
   */
  async createSchedule(data: any) {
    console.warn('🚀 [API Client] createSchedule called');
    console.warn('📅 scheduleDate value:', data.scheduleDate);
    console.warn('📅 scheduleDate type:', typeof data.scheduleDate);
    console.warn('📅 Is Date object?:', data.scheduleDate instanceof Date);
    console.warn('📦 Full data:', data);
    
    // Ensure scheduleDate stays as string (prevent axios date transformation)
    const payload = {
      ...data,
      scheduleDate: typeof data.scheduleDate === 'string' ? data.scheduleDate : String(data.scheduleDate)
    };
    
    console.warn('✅ Final payload before sending:', JSON.stringify(payload, null, 2));
    
    return this.client.post(`${this.basePath}/schedules`, payload, {
      transformRequest: [(requestData, headers) => {
        // Custom transform to ensure dates stay as strings
        console.warn('🔄 transformRequest called');
        console.warn('🔄 requestData:', requestData);
        if (headers) {
          headers['Content-Type'] = 'application/json';
        }
        const jsonString = JSON.stringify(requestData);
        console.warn('🔄 JSON string to send:', jsonString);
        return jsonString;
      }]
    });
  }

  /**
   * Update schedule
   */
  async updateSchedule(id: string, data: any) {
    return this.client.put(`${this.basePath}/schedules/${id}`, data);
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string) {
    return this.client.delete(`${this.basePath}/schedules/${id}`);
  }

  /**
   * Get employee schedules
   * Uses query parameter to filter schedules by employee
   */
  async getEmployeeSchedules(employeeId: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams({ ...params, employeeId }).toString();
    return this.client.get(`${this.basePath}/schedules?${query}`);
  }

  /**
   * Create schedule change request
   */
  async createScheduleChangeRequest(data: any) {
    return this.client.post(`${this.basePath}/schedules/change-requests`, data);
  }

  /**
   * Get schedule change requests
   */
  async getScheduleChangeRequests(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/schedules/change-requests${query ? '?' + query : ''}`);
  }

  /**
   * Review schedule change request
   */
  async reviewScheduleChangeRequest(id: string, data: any) {
    return this.client.post(`${this.basePath}/schedules/change-requests/${id}/review`, data);
  }

  // ============================================================================
  // Pay Structure Templates
  // ============================================================================

  /**
   * Get all pay structure templates
   */
  async getPayStructureTemplates(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.basePath}/pay-structures/templates${query ? '?' + query : ''}`);
  }

  /**
   * Get pay structure template by ID
   */
  async getPayStructureTemplate(id: string) {
    return this.client.get(`${this.basePath}/pay-structures/templates/${id}`);
  }

  /**
   * Create pay structure template
   */
  async createPayStructureTemplate(data: any) {
    return this.client.post(`${this.basePath}/pay-structures/templates`, data);
  }

  /**
   * Update pay structure template
   */
  async updatePayStructureTemplate(id: string, data: any) {
    return this.client.put(`${this.basePath}/pay-structures/templates/${id}`, data);
  }

  /**
   * Publish pay structure template
   */
  async publishPayStructureTemplate(id: string) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${id}/publish`, {});
  }

  /**
   * Deprecate pay structure template
   */
  async deprecatePayStructureTemplate(id: string, data: { reason?: string }) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${id}/deprecate`, data);
  }

  /**
   * Delete pay structure template (draft versions only)
   */
  async deletePayStructureTemplate(id: string) {
    return this.client.delete(`${this.basePath}/pay-structures/templates/${id}`);
  }

  /**
   * Create new version of template
   */
  async createPayStructureTemplateVersion(id: string, data: { versionType: string; changeSummary: string }) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${id}/versions`, data);
  }

  /**
   * Get template version history
   */
  async getPayStructureTemplateVersions(templateCode: string) {
    return this.client.get(`${this.basePath}/pay-structures/templates/versions/${templateCode}`);
  }

  /**
   * Alias for backwards compatibility
   */
  async getTemplateVersions(templateCode: string) {
    return this.getPayStructureTemplateVersions(templateCode);
  }

  /**
   * Get template changelog
   */
  async getPayStructureTemplateChangelog(id: string, compareToId?: string) {
    const query = compareToId ? `?compareToId=${compareToId}` : '';
    return this.client.get(`${this.basePath}/pay-structures/templates/${id}/changelog${query}`);
  }

  /**
   * Compare two template versions
   */
  async compareTemplateVersions(fromId: string, toId: string) {
    return this.client.get(`${this.basePath}/pay-structures/templates/compare?fromId=${fromId}&toId=${toId}`);
  }

  /**
   * Upgrade workers to new template version
   */
  async upgradeWorkersToVersion(templateId: string, data: { workerIds: string[]; effectiveFrom: string; reason?: string }) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${templateId}/upgrade-workers`, data);
  }

  // ============================================================================
  // Pay Structure Components
  // ============================================================================

  /**
   * Add component to template
   */
  async addPayStructureComponent(templateId: string, data: any) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${templateId}/components`, data);
  }

  /**
   * Get template components
   */
  async getPayStructureComponents(templateId: string) {
    return this.client.get(`${this.basePath}/pay-structures/templates/${templateId}/components`);
  }

  /**
   * Update pay structure component
   */
  async updatePayStructureComponent(componentId: string, data: any) {
    return this.client.put(`${this.basePath}/pay-structures/components/${componentId}`, data);
  }

  /**
   * Delete pay structure component
   */
  async deletePayStructureComponent(componentId: string) {
    return this.client.delete(`${this.basePath}/pay-structures/components/${componentId}`);
  }

  /**
   * Reorder components
   */
  async reorderPayStructureComponents(templateId: string, data: { componentOrders: Array<{ componentId: string; sequenceOrder: number }> }) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${templateId}/components/reorder`, data);
  }

  // ============================================================================
  // Template Inclusions (Nested Templates)
  // ============================================================================

  /**
   * Add template inclusion to parent template
   */
  async addTemplateInclusion(parentTemplateId: string, data: {
    includedTemplateCode: string;
    versionConstraint?: string;
    inclusionPriority: number;
    inclusionMode?: 'merge' | 'override' | 'append';
    isActive?: boolean;
  }) {
    return this.client.post(`${this.basePath}/pay-structures/templates/${parentTemplateId}/inclusions`, data);
  }

  /**
   * Get template inclusions for a template
   */
  async getTemplateInclusions(templateId: string) {
    return this.client.get(`${this.basePath}/pay-structures/templates/${templateId}/inclusions`);
  }

  /**
   * Update template inclusion
   */
  async updateTemplateInclusion(parentTemplateId: string, inclusionId: string, data: {
    versionConstraint?: string;
    inclusionPriority?: number;
    inclusionMode?: 'merge' | 'override' | 'append';
    isActive?: boolean;
  }) {
    return this.client.patch(`${this.basePath}/pay-structures/templates/${parentTemplateId}/inclusions/${inclusionId}`, data);
  }

  /**
   * Remove template inclusion
   */
  async deleteTemplateInclusion(parentTemplateId: string, inclusionId: string) {
    return this.client.delete(`${this.basePath}/pay-structures/templates/${parentTemplateId}/inclusions/${inclusionId}`);
  }

  /**
   * Get resolved template with all inclusions merged
   */
  async getResolvedPayStructureTemplate(templateId: string, asOfDate?: string) {
    const query = asOfDate ? `?asOfDate=${encodeURIComponent(asOfDate)}` : '';
    return this.client.get(`${this.basePath}/pay-structures/templates/${templateId}/resolved${query}`);
  }

  // ============================================================================
  // Worker Pay Structure Assignments
  // ============================================================================

  /**
   * Assign template to worker
   */
  async assignPayStructureToWorker(employeeId: string, data: any) {
    return this.client.post(`${this.basePath}/pay-structures/workers/${employeeId}/assignments`, data);
  }

  /**
   * Get current worker pay structure
   */
  async getCurrentWorkerPayStructure(employeeId: string, params?: { asOfDate?: string }) {
    // Filter out undefined values to avoid "undefined" string in query params
    const cleanParams: Record<string, string> = {};
    if (params?.asOfDate !== undefined) {
      cleanParams.asOfDate = params.asOfDate;
    }
    const query = new URLSearchParams(cleanParams).toString();
    return this.client.get(`${this.basePath}/pay-structures/workers/${employeeId}/current${query ? '?' + query : ''}`);
  }

  /**
   * Get worker pay structure history
   */
  async getWorkerPayStructureHistory(employeeId: string) {
    return this.client.get(`${this.basePath}/pay-structures/workers/${employeeId}/history`);
  }

  /**
   * Upgrade worker to new template version
   */
  async upgradeWorkerPayStructure(employeeId: string, data: { newTemplateId: string; effectiveFrom: string }) {
    return this.client.post(`${this.basePath}/pay-structures/workers/${employeeId}/upgrade`, data);
  }

  // ============================================================================
  // Component Overrides
  // ============================================================================

  /**
   * Add component override for worker
   */
  async addPayStructureOverride(employeeId: string, data: any) {
    return this.client.post(`${this.basePath}/pay-structures/workers/${employeeId}/overrides`, data);
  }

  /**
   * Get worker component overrides
   */
  async getPayStructureOverrides(workerStructureId: string) {
    return this.client.get(`${this.basePath}/pay-structures/worker-structures/${workerStructureId}/overrides`);
  }

  /**
   * Update component override
   */
  async updatePayStructureOverride(overrideId: string, data: any) {
    return this.client.put(`${this.basePath}/pay-structures/overrides/${overrideId}`, data);
  }

  /**
   * Delete component override
   */
  async deletePayStructureOverride(overrideId: string) {
    return this.client.delete(`${this.basePath}/pay-structures/overrides/${overrideId}`);
  }

  // ============================================================================
  // Payslip Templates
  // ============================================================================

  /**
   * Get all payslip templates
   */
  async getPayslipTemplates(params?: { status?: string; layoutType?: string; isDefault?: boolean }) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<ApiResponse<any[]>>(
      `${this.basePath}/payslip-templates${query ? '?' + query : ''}`
    );
  }

  /**
   * Get payslip template by ID
   */
  async getPayslipTemplate(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}`
    );
  }

  /**
   * Create payslip template
   */
  async createPayslipTemplate(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/payslip-templates`,
      data
    );
  }

  /**
   * Update payslip template
   */
  async updatePayslipTemplate(id: string, data: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}`,
      data
    );
  }

  /**
   * Delete payslip template
   */
  async deletePayslipTemplate(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/payslip-templates/${id}`
    );
  }

  /**
   * Duplicate payslip template
   */
  async duplicatePayslipTemplate(id: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}/duplicate`
    );
  }

  /**
   * Activate payslip template
   */
  async activatePayslipTemplate(id: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}/activate`
    );
  }

  /**
   * Archive payslip template
   */
  async archivePayslipTemplate(id: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}/archive`
    );
  }

  /**
   * Generate preview PDF for template
   */
  async previewPayslipTemplate(id: string, paycheckId?: string) {
    return this.client.post(
      `${this.basePath}/payslip-templates/${id}/preview`,
      { paycheckId },
      { responseType: 'blob' }
    );
  }

  /**
   * Get template assignments
   */
  async getPayslipTemplateAssignments(id: string) {
    return this.client.get<ApiResponse<any[]>>(
      `${this.basePath}/payslip-templates/${id}/assignments`
    );
  }

  /**
   * Create template assignment
   */
  async createPayslipTemplateAssignment(id: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}/assignments`,
      data
    );
  }

  /**
   * Update template assignment
   */
  async updatePayslipTemplateAssignment(id: string, assignmentId: string, data: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/payslip-templates/${id}/assignments/${assignmentId}`,
      data
    );
  }

  /**
   * Delete template assignment
   */
  async deletePayslipTemplateAssignment(id: string, assignmentId: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/payslip-templates/${id}/assignments/${assignmentId}`
    );
  }

  // ==================== TEMPORAL PATTERNS ====================

  /**
   * Test temporal pattern against workers
   * POST /api/paylinq/patterns/test
   */
  async testTemporalPattern(data: {
    pattern: {
      patternType: 'day_of_week' | 'shift_type' | 'station' | 'role' | 'hours_threshold' | 'combined';
      dayOfWeek?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
      consecutiveCount: number;
      lookbackPeriodDays?: number;
      shiftTypeId?: string;
      stationId?: string;
      roleId?: string;
      hoursThreshold?: number;
      comparisonOperator?: 'greater_than' | 'less_than' | 'equals' | 'greater_or_equal' | 'less_or_equal';
      combinedPatterns?: any[];
      logicalOperator?: 'AND' | 'OR';
    };
    employeeIds: string[];
    asOfDate?: string;
  }) {
    return this.client.post<ApiResponse<{
      totalTested: number;
      qualifiedCount: number;
      notQualifiedCount: number;
      qualifiedWorkers: any[];
      notQualifiedWorkers: any[];
      allResults: any[];
    }>>(
      `${this.basePath}/patterns/test`,
      data
    );
  }

  /**
   * Evaluate temporal pattern for single worker
   * POST /api/paylinq/patterns/evaluate
   */
  async evaluateTemporalPattern(data: {
    pattern: any;
    employeeId: string;
    asOfDate?: string;
  }) {
    return this.client.post<ApiResponse<{
      qualified: boolean;
      patternType: string;
      metadata: any;
      executionTime: number;
      evaluatedAt: string;
    }>>(
      `${this.basePath}/patterns/evaluate`,
      data
    );
  }

  /**
   * Get available shift types for pattern configuration
   * GET /api/paylinq/patterns/shift-types
   */
  async getPatternShiftTypes(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<any>>(
      `${this.basePath}/patterns/shift-types`,
      { params }
    );
  }

  /**
   * Get available stations for pattern configuration
   * GET /api/paylinq/patterns/stations
   */
  async getPatternStations(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<{
      id: string;
      stationName: string;
      stationCode: string;
      locationId: string;
    }>>(
      `${this.basePath}/patterns/stations`,
      { params }
    );
  }

  /**
   * Get available roles for pattern configuration
   * GET /api/paylinq/patterns/roles
   */
  async getPatternRoles(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<{
      id: string;
      roleName: string;
      roleCode: string;
      skillLevel: string;
    }>>(
      `${this.basePath}/patterns/roles`,
      { params }
    );
  }

  /**
   * Get pattern validation schema
   * GET /api/paylinq/patterns/validation-schema
   */
  async getPatternValidationSchema() {
    return this.client.get<ApiResponse<{ schema: any }>>(
      `${this.basePath}/patterns/validation-schema`
    );
  }

  // ============================================================================
  // Currency & Exchange Rates
  // ============================================================================

  /**
   * Get all currencies
   */
  async getCurrencies(params?: { status?: string } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/currencies${query ? '?' + query : ''}`);
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates(params?: {
    fromCurrency?: string;
    toCurrency?: string;
    source?: string;
    status?: string;
  } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/exchange-rates${query ? '?' + query : ''}`);
  }

  /**
   * Create exchange rate
   */
  async createExchangeRate(data: any) {
    return this.client.post(`${this.basePath}/exchange-rates`, data);
  }

  /**
   * Update exchange rate
   */
  async updateExchangeRate(id: string, data: any) {
    return this.client.put(`${this.basePath}/exchange-rates/${id}`, data);
  }

  /**
   * Delete exchange rate
   */
  async deleteExchangeRate(id: string) {
    return this.client.delete(`${this.basePath}/exchange-rates/${id}`);
  }

  /**
   * Convert currency
   */
  async convertCurrency(data: {
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    asOfDate?: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    return this.client.post(`${this.basePath}/currency/convert`, data);
  }

  /**
   * Get conversion history
   */
  async getConversionHistory(params?: {
    referenceType?: string;
    referenceId?: string;
    fromCurrency?: string;
    toCurrency?: string;
  } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/currency/conversions${query ? '?' + query : ''}`);
  }

  /**
   * Get exchange rate history
   */
  async getExchangeRateHistory(params: {
    fromCurrency: string;
    toCurrency: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/currency/rate-history?${query}`);
  }

  /**
   * Get currency configuration
   */
  async getCurrencyConfig() {
    return this.client.get(`${this.basePath}/currency/config`);
  }

  /**
   * Update currency configuration
   */
  async updateCurrencyConfig(data: any) {
    return this.client.put(`${this.basePath}/currency/config`, data);
  }

  /**
   * Bulk import exchange rates
   */
  async bulkImportExchangeRates(rates: any[]) {
    return this.client.post(`${this.basePath}/currency/bulk-import`, { rates });
  }

  /**
   * Batch currency conversions
   */
  async batchConvertCurrency(conversions: Array<{
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    asOfDate?: string;
  }>) {
    return this.client.post(`${this.basePath}/currency/batch-convert`, { conversions });
  }

  /**
   * Get currency statistics
   */
  async getCurrencyStats() {
    return this.client.get(`${this.basePath}/currency/stats`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.client.get(`${this.basePath}/currency/cache/stats`);
  }

  /**
   * Clear currency cache
   */
  async clearCurrencyCache() {
    return this.client.post(`${this.basePath}/currency/cache/clear`);
  }

  /**
   * Refresh materialized views
   */
  async refreshCurrencyViews() {
    return this.client.post(`${this.basePath}/currency/refresh-views`);
  }

  /**
   * Get currency audit log
   */
  async getCurrencyAuditLog(params?: {
    action?: string;
    startDate?: string;
    endDate?: string;
  } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/currency/audit${query ? '?' + query : ''}`);
  }

  // ============================================================================
  // Approval Workflows
  // ============================================================================

  /**
   * Create approval request
   */
  async createApprovalRequest(data: {
    requestType: 'conversion' | 'rate_change' | 'bulk_rate_import' | 'configuration_change';
    referenceType: string;
    referenceId: string;
    requestData: any;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    reason?: string;
  }) {
    return this.client.post(`${this.basePath}/approvals`, data);
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(params?: {
    requestType?: string;
    priority?: string;
  } & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/approvals/pending${query ? '?' + query : ''}`);
  }

  /**
   * Get approval by ID
   */
  async getApproval(id: string) {
    return this.client.get(`${this.basePath}/approvals/${id}`);
  }

  /**
   * Approve request
   */
  async approveRequest(id: string, comments?: string) {
    return this.client.post(`${this.basePath}/approvals/${id}/approve`, { comments });
  }

  /**
   * Reject request
   */
  async rejectRequest(id: string, comments: string) {
    return this.client.post(`${this.basePath}/approvals/${id}/reject`, { comments });
  }

  /**
   * Get approval history
   */
  async getApprovalHistory(referenceType: string, referenceId: string) {
    return this.client.get(`${this.basePath}/approvals/history/${referenceType}/${referenceId}`);
  }

  /**
   * Expire old approval requests (admin only)
   */
  async expireOldApprovals() {
    return this.client.post(`${this.basePath}/approvals/expire`);
  }

  /**
   * Get approval statistics
   */
  async getApprovalStatistics(params?: { startDate?: string; endDate?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get(`${this.basePath}/approvals/statistics${query ? '?' + query : ''}`);
  }

  // ============================================================================
  // Loontijdvak (Dutch Tax Periods)
  // ============================================================================

  /**
   * List loontijdvak periods with filters
   */
  async getLoontijdvakken(filters?: {
    year?: number;
    periodType?: 'week' | '4_weeks' | 'month' | 'quarter' | 'year';
    isActive?: boolean;
  }) {
    const query = new URLSearchParams(filters as any).toString();
    return this.client.get(`${this.basePath}/loontijdvak${query ? '?' + query : ''}`);
  }

  /**
   * Get loontijdvak period by ID
   */
  async getLoontijdvak(id: string) {
    return this.client.get(`${this.basePath}/loontijdvak/${id}`);
  }

  /**
   * Get active loontijdvak for a specific date
   */
  async getActiveLoontijdvak(date: string, periodType?: string) {
    const query = new URLSearchParams({ date, ...(periodType && { periodType }) }).toString();
    return this.client.get(`${this.basePath}/loontijdvak/active?${query}`);
  }

  /**
   * Create new loontijdvak period
   */
  async createLoontijdvak(data: {
    periodType: 'week' | '4_weeks' | 'month' | 'quarter' | 'year';
    periodNumber: number;
    year: number;
    startDate: string;
    endDate: string;
    taxTableVersion?: string;
    isActive?: boolean;
  }) {
    return this.client.post(`${this.basePath}/loontijdvak`, data);
  }

  /**
   * Update loontijdvak period
   */
  async updateLoontijdvak(id: string, data: Partial<{
    taxTableVersion: string;
    isActive: boolean;
  }>) {
    return this.client.put(`${this.basePath}/loontijdvak/${id}`, data);
  }

  /**
   * Delete loontijdvak period
   */
  async deleteLoontijdvak(id: string) {
    return this.client.delete(`${this.basePath}/loontijdvak/${id}`);
  }

  /**
   * Bulk generate loontijdvak periods for a year
   */
  async bulkGenerateLoontijdvakken(
    year: number,
    periodTypes: Array<'week' | '4_weeks' | 'month' | 'quarter' | 'year'>
  ) {
    return this.client.post(`${this.basePath}/loontijdvak/bulk-generate`, { year, periodTypes });
  }

  /**
   * Check for overlapping loontijdvak periods
   */
  async checkLoontijdvakOverlaps() {
    return this.client.get(`${this.basePath}/loontijdvak/check-overlaps`);
  }

  // ============================================================================
  // Employee Pay Components (Custom Overrides - System 1)
  // ============================================================================

  // ============================================================================
  // Employee Component Assignments
  // ============================================================================

  /**
   * Assign component to employee with configuration
   */
  async assignComponentToEmployee(
    employeeId: string,
    data: CreateEmployeeComponentAssignmentRequest
  ) {
    return this.client.post<ApiResponse<EmployeePayComponentAssignment>>(
      `${this.basePath}/employees/${employeeId}/assignments`,
      data
    );
  }

  /**
   * Get employee's component assignments
   */
  async getEmployeeComponentAssignments(
    employeeId: string,
    filters?: EmployeeComponentFilters
  ) {
    const query = new URLSearchParams(filters as any).toString();
    return this.client.get<ApiResponse<EmployeePayComponentAssignment[]>>(
      `${this.basePath}/employees/${employeeId}/assignments${query ? '?' + query : ''}`
    );
  }

  /**
   * Update employee component assignment
   */
  async updateEmployeeComponentAssignment(
    employeeId: string,
    assignmentId: string,
    data: UpdateEmployeeComponentAssignmentRequest
  ) {
    return this.client.put<ApiResponse<EmployeePayComponentAssignment>>(
      `${this.basePath}/employees/${employeeId}/assignments/${assignmentId}`,
      data
    );
  }

  /**
   * Remove employee component assignment
   */
  async removeEmployeeComponentAssignment(employeeId: string, assignmentId: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/employees/${employeeId}/assignments/${assignmentId}`
    );
  }
}

