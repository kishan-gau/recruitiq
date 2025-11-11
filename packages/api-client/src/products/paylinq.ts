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
  CustomPayComponent,
  CreatePayComponentRequest,
  UpdatePayComponentRequest,
  CreateFormulaRequest,
  UpdateFormulaRequest,
  CreateCustomPayComponentRequest,
  UpdateCustomPayComponentRequest,
  FormulaValidationResult,
  PayComponentFilters,
  // Payments
  PayrollRun,
  Paycheck,
  PayrollRunComponent,
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
 */
export class PaylinqAPI {
  private readonly basePath = '/products/paylinq';

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
      `${this.basePath}/worker-type-templates${query ? '?' + query : ''}`
    );
  }

  /**
   * Get worker type template by ID
   */
  async getWorkerTypeTemplate(id: string) {
    return this.client.get<ApiResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-type-templates/${id}`
    );
  }

  /**
   * Create worker type template
   */
  async createWorkerTypeTemplate(data: CreateWorkerTypeTemplateRequest) {
    return this.client.post<ApiResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-type-templates`,
      data
    );
  }

  /**
   * Update worker type template
   */
  async updateWorkerTypeTemplate(id: string, data: UpdateWorkerTypeTemplateRequest) {
    return this.client.put<ApiResponse<WorkerTypeTemplate>>(
      `${this.basePath}/worker-type-templates/${id}`,
      data
    );
  }

  /**
   * Delete worker type template
   */
  async deleteWorkerTypeTemplate(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/worker-type-templates/${id}`
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
      `${this.basePath}/shift-types${query ? '?' + query : ''}`
    );
  }

  /**
   * Get shift type by ID
   */
  async getShiftType(id: string) {
    return this.client.get<ApiResponse<ShiftType>>(
      `${this.basePath}/shift-types/${id}`
    );
  }

  /**
   * Create shift type
   */
  async createShiftType(data: CreateShiftTypeRequest) {
    return this.client.post<ApiResponse<ShiftType>>(
      `${this.basePath}/shift-types`,
      data
    );
  }

  /**
   * Update shift type
   */
  async updateShiftType(id: string, data: UpdateShiftTypeRequest) {
    return this.client.put<ApiResponse<ShiftType>>(
      `${this.basePath}/shift-types/${id}`,
      data
    );
  }

  /**
   * Delete shift type
   */
  async deleteShiftType(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/shift-types/${id}`
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

  /**
   * Get custom pay components for employee
   */
  async getCustomPayComponents(employeeId: string) {
    return this.client.get<ApiResponse<CustomPayComponent[]>>(
      `${this.basePath}/custom-pay-components/employee/${employeeId}`
    );
  }

  /**
   * Create custom pay component
   */
  async createCustomPayComponent(data: CreateCustomPayComponentRequest) {
    return this.client.post<ApiResponse<CustomPayComponent>>(
      `${this.basePath}/custom-pay-components`,
      data
    );
  }

  /**
   * Update custom pay component
   */
  async updateCustomPayComponent(id: string, data: UpdateCustomPayComponentRequest) {
    return this.client.put<ApiResponse<CustomPayComponent>>(
      `${this.basePath}/custom-pay-components/${id}`,
      data
    );
  }

  /**
   * Delete custom pay component
   */
  async deleteCustomPayComponent(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/custom-pay-components/${id}`
    );
  }

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
    return this.client.get<ApiResponse<PayrollRun>>(
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
   * Approve payroll run
   */
  async approvePayrollRun(data: ApprovePayrollRequest) {
    return this.client.post<ApiResponse<PayrollRun>>(
      `${this.basePath}/payroll-runs/${data.payrollRunId}/approve`,
      data
    );
  }

  /**
   * Process payroll run
   */
  async processPayrollRun(data: ProcessPayrollRequest) {
    return this.client.post<ApiResponse<PayrollRun>>(
      `${this.basePath}/payroll-runs/${data.payrollRunId}/process`,
      data
    );
  }

  /**
   * Cancel payroll run
   */
  async cancelPayrollRun(id: string) {
    return this.client.post<ApiResponse<PayrollRun>>(
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
   * Get paycheck components
   */
  async getPaycheckComponents(paycheckId: string) {
    return this.client.get<ApiResponse<PayrollRunComponent[]>>(
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
    return this.client.get(`${this.basePath}/dashboard`);
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
    return this.client.post(`${this.basePath}/schedules`, data);
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
   */
  async getEmployeeSchedules(employeeId: string) {
    return this.client.get(`${this.basePath}/schedules/employees/${employeeId}/schedules`);
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
}
