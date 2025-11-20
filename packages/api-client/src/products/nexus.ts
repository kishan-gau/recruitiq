import { APIClient } from '../core/client';
import type {
  ApiResponse,
  PaginationParams,
} from '@recruitiq/types';

/**
 * Location types
 */
export type LocationType = 'headquarters' | 'branch' | 'remote' | 'warehouse' | 'store';

export interface Location {
  id: string;
  organizationId: string;
  locationCode: string;
  locationName: string;
  locationType?: LocationType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string | null;
}

export interface CreateLocationRequest {
  locationCode: string;
  locationName: string;
  locationType?: LocationType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateLocationRequest extends Partial<CreateLocationRequest> {}

export interface LocationFilters {
  search?: string;
  locationType?: LocationType;
  isActive?: boolean;
  country?: string;
}

/**
 * Nexus Product API Client
 * HRIS/Workspace management system endpoints
 * 
 * ARCHITECTURE: basePath is relative to APIClient's baseURL ('/api')
 * Final URLs: /api + /products/nexus/* = /api/products/nexus/*
 * 
 * NOTE: Type definitions should come from @/types in the Nexus app for detailed types.
 * This client provides generic API methods that return ApiResponse<any>.
 */
export class NexusClient {
  private readonly basePath = 'products/nexus';

  constructor(private client: APIClient) {}

  // ============================================================================
  // Locations
  // ============================================================================

  /**
   * Get all locations with optional filters
   */
  async getLocations(params?: LocationFilters & PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.client.get<ApiResponse<Location[]>>(
      `${this.basePath}/locations${query ? '?' + query : ''}`
    );
  }

  /**
   * Get location by ID
   */
  async getLocation(id: string) {
    return this.client.get<ApiResponse<Location>>(
      `${this.basePath}/locations/${id}`
    );
  }

  /**
   * Create a new location
   */
  async createLocation(data: CreateLocationRequest) {
    return this.client.post<ApiResponse<Location>>(
      `${this.basePath}/locations`,
      data
    );
  }

  /**
   * Update an existing location
   */
  async updateLocation(id: string, data: UpdateLocationRequest) {
    return this.client.patch<ApiResponse<Location>>(
      `${this.basePath}/locations/${id}`,
      data
    );
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/locations/${id}`
    );
  }

  // ============================================================================
  // Attendance Records
  // ============================================================================

  /**
   * List attendance records with optional filters
   */
  async listAttendanceRecords(filters?: any) {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.clockStatus) params.append('clockStatus', filters.clockStatus);
    
    const queryString = params.toString();
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/records${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get attendance record by ID
   */
  async getAttendanceRecord(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/records/${id}`
    );
  }

  /**
   * Get employee attendance records
   */
  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/records/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`
    );
  }

  /**
   * Get today's attendance records
   */
  async getTodayAttendance() {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/records/today`
    );
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/records`,
      data
    );
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/attendance/records/${id}`,
      updates
    );
  }

  /**
   * Delete attendance record
   */
  async deleteAttendanceRecord(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/attendance/records/${id}`
    );
  }

  // ============================================================================
  // Clock In/Out Operations
  // ============================================================================

  /**
   * Clock in
   */
  async clockIn(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/clock-in`,
      data
    );
  }

  /**
   * Clock out
   */
  async clockOut(recordId: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/records/${recordId}/clock-out`,
      data
    );
  }

  /**
   * Start break
   */
  async startBreak(recordId: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/records/${recordId}/break-start`,
      data
    );
  }

  /**
   * End break
   */
  async endBreak(recordId: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/records/${recordId}/break-end`,
      data
    );
  }

  /**
   * Get current clock status for employee
   */
  async getCurrentClockStatus(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/clock-status/${employeeId}`
    );
  }

  // ============================================================================
  // Work Schedules
  // ============================================================================

  /**
   * List work schedules with optional filters
   */
  async listWorkSchedules(filters?: any) {
    const params = new URLSearchParams();
    if (filters?.shiftType) params.append('shiftType', filters.shiftType);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    
    const queryString = params.toString();
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/schedules${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get work schedule by ID
   */
  async getWorkSchedule(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/schedules/${id}`
    );
  }

  /**
   * Create work schedule
   */
  async createWorkSchedule(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/schedules`,
      data
    );
  }

  /**
   * Update work schedule
   */
  async updateWorkSchedule(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/attendance/schedules/${id}`,
      updates
    );
  }

  /**
   * Delete work schedule
   */
  async deleteWorkSchedule(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/attendance/schedules/${id}`
    );
  }

  // ============================================================================
  // Timesheets
  // ============================================================================

  /**
   * List timesheets with optional filters
   */
  async listTimesheets(filters?: any) {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.weekStartDate) params.append('weekStartDate', filters.weekStartDate);
    if (filters?.weekEndDate) params.append('weekEndDate', filters.weekEndDate);
    
    const queryString = params.toString();
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get timesheet by ID
   */
  async getTimesheet(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets/${id}`
    );
  }

  /**
   * Get employee timesheets
   */
  async getEmployeeTimesheets(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets/employee/${employeeId}`
    );
  }

  /**
   * Create timesheet
   */
  async createTimesheet(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets`,
      data
    );
  }

  /**
   * Update timesheet
   */
  async updateTimesheet(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets/${id}`,
      updates
    );
  }

  /**
   * Submit timesheet
   */
  async submitTimesheet(id: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets/${id}/submit`,
      data
    );
  }

  /**
   * Approve timesheet
   */
  async approveTimesheet(id: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets/${id}/approve`,
      data
    );
  }

  /**
   * Reject timesheet
   */
  async rejectTimesheet(id: string, data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/timesheets/${id}/reject`,
      data
    );
  }

  /**
   * Delete timesheet
   */
  async deleteTimesheet(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/attendance/timesheets/${id}`
    );
  }

  // ============================================================================
  // Statistics & Reports
  // ============================================================================

  /**
   * Get attendance statistics
   */
  async getAttendanceStatistics() {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/statistics`
    );
  }

  /**
   * Get employee attendance summary
   */
  async getEmployeeAttendanceSummary(employeeId: string, startDate: string, endDate: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/attendance/summary/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`
    );
  }

  /**
   * Get department attendance report
   */
  async getDepartmentAttendanceReport(filters: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/reports/department`,
      filters
    );
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(filters: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/attendance/reports/generate`,
      filters
    );
  }

  // ============================================================================
  // Employees
  // ============================================================================

  /**
   * List employees with optional filters
   */
  async listEmployees(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees`,
      { params: { page: 1, limit: 50, ...filters } }
    );
  }

  /**
   * List employees with pagination
   */
  async listEmployeesPaginated(filters?: any, page = 1, limit = 20) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees`,
      { params: { ...filters, page, limit } }
    );
  }

  /**
   * Get employee by ID
   */
  async getEmployee(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees/${id}`
    );
  }

  /**
   * Create new employee
   */
  async createEmployee(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/employees`,
      data
    );
  }

  /**
   * Update employee
   */
  async updateEmployee(id: string, updates: any) {
    return this.client.patch<ApiResponse<any>>(
      `${this.basePath}/employees/${id}`,
      updates
    );
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(id: string, terminationData: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/employees/${id}/terminate`,
      terminationData
    );
  }

  /**
   * Rehire employee
   */
  async rehireEmployee(id: string, rehireData: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/employees/${id}/rehire`,
      rehireData
    );
  }

  /**
   * Get employment history
   */
  async getEmploymentHistory(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees/${id}/employment-history`
    );
  }

  /**
   * Check rehire eligibility
   */
  async checkRehireEligibility(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees/${id}/rehire-eligibility`
    );
  }

  /**
   * Delete employee
   */
  async deleteEmployee(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/employees/${id}`
    );
  }

  /**
   * Search employees
   */
  async searchEmployees(query: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees/search`,
      { params: { q: query } }
    );
  }

  /**
   * Get organization chart
   */
  async getOrgChart() {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees/org-chart`
    );
  }

  // ============================================================================
  // Employee User Access
  // ============================================================================

  /**
   * Grant system access to employee
   */
  async grantSystemAccess(employeeId: string, accessData: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/employees/${employeeId}/user-access/grant`,
      accessData
    );
  }

  /**
   * Get user account status
   */
  async getUserAccountStatus(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/employees/${employeeId}/user-access`
    );
  }

  /**
   * Revoke system access
   */
  async revokeSystemAccess(employeeId: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/employees/${employeeId}/user-access`
    );
  }

  /**
   * Update user access
   */
  async updateUserAccess(employeeId: string, updates: any) {
    return this.client.patch<ApiResponse<any>>(
      `${this.basePath}/employees/${employeeId}/user-access`,
      updates
    );
  }

  // ============================================================================
  // Departments
  // ============================================================================

  /**
   * List departments with optional filters
   */
  async listDepartments(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/departments`,
      { params: filters }
    );
  }

  /**
   * Get department by ID
   */
  async getDepartment(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/departments/${id}`
    );
  }

  /**
   * Create department
   */
  async createDepartment(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/departments`,
      data
    );
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, updates: any) {
    return this.client.patch<ApiResponse<any>>(
      `${this.basePath}/departments/${id}`,
      updates
    );
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/departments/${id}`
    );
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/departments/${id}/hierarchy`
    );
  }

  /**
   * Get department employees
   */
  async getDepartmentEmployees(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/departments/${id}/employees`
    );
  }

  /**
   * Get organization structure
   */
  async getOrganizationStructure() {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/departments/structure/full`
    );
  }

  // ============================================================================
  // Time Off - Requests
  // ============================================================================

  /**
   * List time-off requests with filters
   */
  async listTimeOffRequests(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/requests`,
      { params: filters }
    );
  }

  /**
   * Get time-off request by ID
   */
  async getTimeOffRequest(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/requests/${id}`
    );
  }

  /**
   * Get employee's time-off requests
   */
  async getEmployeeTimeOffRequests(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/requests/employee/${employeeId}`
    );
  }

  /**
   * Create time-off request
   */
  async createTimeOffRequest(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/time-off/requests`,
      data
    );
  }

  /**
   * Update time-off request
   */
  async updateTimeOffRequest(id: string, updates: any) {
    return this.client.patch<ApiResponse<any>>(
      `${this.basePath}/time-off/requests/${id}`,
      updates
    );
  }

  /**
   * Delete time-off request
   */
  async deleteTimeOffRequest(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/time-off/requests/${id}`
    );
  }

  /**
   * Review time-off request (approve/reject)
   */
  async reviewTimeOffRequest(id: string, review: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/time-off/requests/${id}/review`,
      review
    );
  }

  /**
   * Cancel time-off request
   */
  async cancelTimeOffRequest(id: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/time-off/requests/${id}/cancel`
    );
  }

  // ============================================================================
  // Time Off - Balances
  // ============================================================================

  /**
   * Get employee's time-off balances
   */
  async getEmployeeTimeOffBalances(employeeId: string, year?: number) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/balances/employee/${employeeId}`,
      { params: { year } }
    );
  }

  /**
   * List all time-off balances
   */
  async listTimeOffBalances(year?: number) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/balances`,
      { params: { year } }
    );
  }

  // ============================================================================
  // Time Off - Policies
  // ============================================================================

  /**
   * List time-off policies
   */
  async listTimeOffPolicies() {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/policies`
    );
  }

  /**
   * Get time-off policy by ID
   */
  async getTimeOffPolicy(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/policies/${id}`
    );
  }

  // ============================================================================
  // Time Off - Calendar
  // ============================================================================

  /**
   * Get calendar events for time-off
   */
  async getTimeOffCalendarEvents(startDate: string, endDate: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/time-off/calendar`,
      { params: { startDate, endDate } }
    );
  }

  // ============================================================================
  // Benefits - Plans
  // ============================================================================

  /**
   * List benefit plans with filters
   */
  async listBenefitPlans(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/plans`,
      { params: filters }
    );
  }

  /**
   * Get benefit plan by ID
   */
  async getBenefitPlan(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/plans/${id}`
    );
  }

  /**
   * Create benefit plan
   */
  async createBenefitPlan(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/benefits/plans`,
      data
    );
  }

  /**
   * Update benefit plan
   */
  async updateBenefitPlan(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/benefits/plans/${id}`,
      updates
    );
  }

  /**
   * Delete benefit plan
   */
  async deleteBenefitPlan(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/benefits/plans/${id}`
    );
  }

  /**
   * Get benefit statistics
   */
  async getBenefitStatistics() {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/statistics`
    );
  }

  /**
   * Get plan enrollment summary
   */
  async getPlanEnrollmentSummary(planId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/plans/${planId}/enrollment-summary`
    );
  }

  // ============================================================================
  // Benefits - Enrollments
  // ============================================================================

  /**
   * List benefit enrollments with filters
   */
  async listBenefitEnrollments(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/enrollments`,
      { params: filters }
    );
  }

  /**
   * Get benefit enrollment by ID
   */
  async getBenefitEnrollment(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/enrollments/${id}`
    );
  }

  /**
   * Get employee's benefit enrollments
   */
  async getEmployeeBenefitEnrollments(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/enrollments/employee/${employeeId}`
    );
  }

  /**
   * Create benefit enrollment
   */
  async createBenefitEnrollment(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/benefits/enrollments`,
      data
    );
  }

  /**
   * Update benefit enrollment
   */
  async updateBenefitEnrollment(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/benefits/enrollments/${id}`,
      updates
    );
  }

  /**
   * Cancel benefit enrollment
   */
  async cancelBenefitEnrollment(id: string, reason: string) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/benefits/enrollments/${id}/cancel`,
      { reason }
    );
  }

  /**
   * Delete benefit enrollment
   */
  async deleteBenefitEnrollment(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/benefits/enrollments/${id}`
    );
  }

  // ============================================================================
  // Benefits - Dependents
  // ============================================================================

  /**
   * List dependents with filters
   */
  async listDependents(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/dependents`,
      { params: filters }
    );
  }

  /**
   * Get dependent by ID
   */
  async getDependent(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/dependents/${id}`
    );
  }

  /**
   * Get employee's dependents
   */
  async getEmployeeDependents(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/benefits/dependents/employee/${employeeId}`
    );
  }

  /**
   * Create dependent
   */
  async createDependent(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/benefits/dependents`,
      data
    );
  }

  /**
   * Update dependent
   */
  async updateDependent(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/benefits/dependents/${id}`,
      updates
    );
  }

  /**
   * Delete dependent
   */
  async deleteDependent(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/benefits/dependents/${id}`
    );
  }

  // ============================================================================
  // Contracts
  // ============================================================================

  /**
   * List contracts with filters
   */
  async listContracts(filters?: any) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/contracts`,
      { params: filters }
    );
  }

  /**
   * Get contract by ID
   */
  async getContract(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/contracts/${id}`
    );
  }

  /**
   * Get employee's contracts
   */
  async getEmployeeContracts(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/contracts/employee/${employeeId}`
    );
  }

  /**
   * Get employee's current active contract
   */
  async getCurrentContract(employeeId: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/contracts/employee/${employeeId}/current`
    );
  }

  /**
   * Create contract
   */
  async createContract(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/contracts`,
      data
    );
  }

  /**
   * Update contract
   */
  async updateContract(id: string, updates: any) {
    return this.client.patch<ApiResponse<any>>(
      `${this.basePath}/contracts/${id}`,
      updates
    );
  }

  /**
   * Delete contract
   */
  async deleteContract(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/contracts/${id}`
    );
  }

  /**
   * Activate contract
   */
  async activateContract(id: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/contracts/${id}/activate`
    );
  }

  /**
   * Terminate contract
   */
  async terminateContract(id: string, terminationDate: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/contracts/${id}/terminate`,
      { terminationDate }
    );
  }

  /**
   * Upload contract document
   */
  async uploadContractDocument(id: string, file: File) {
    const formData = new FormData();
    formData.append('document', file);
    
    return this.client.post<ApiResponse<{ documentUrl: string }>>(
      `${this.basePath}/contracts/${id}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  // ============================================================================
  // Documents - Main Document Operations
  // ============================================================================

  async listDocuments(filters?: any) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents`, { params: filters });
  }

  async getDocument(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/${id}`);
  }

  async createDocument(data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents`, data);
  }

  async updateDocument(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(`${this.basePath}/documents/${id}`, updates);
  }

  async deleteDocument(id: string) {
    return this.client.delete<ApiResponse<void>>(`${this.basePath}/documents/${id}`);
  }

  async downloadDocument(id: string) {
    return this.client.get<Blob>(`${this.basePath}/documents/${id}/download`, { responseType: 'blob' });
  }

  async getDocumentUrl(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/${id}/url`);
  }

  async archiveDocument(id: string) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/${id}/archive`);
  }

  async restoreDocument(id: string) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/${id}/restore`);
  }

  // ============================================================================
  // Documents - Folders
  // ============================================================================

  async listFolders(parentId?: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/folders`, { params: { parentId } });
  }

  async getFolder(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/folders/${id}`);
  }

  async createFolder(data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/folders`, data);
  }

  async updateFolder(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(`${this.basePath}/documents/folders/${id}`, updates);
  }

  async deleteFolder(id: string) {
    return this.client.delete<ApiResponse<void>>(`${this.basePath}/documents/folders/${id}`);
  }

  async getFolderDocuments(folderId: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/folders/${folderId}/documents`);
  }

  // ============================================================================
  // Documents - Access Logs
  // ============================================================================

  async getDocumentAccessLogs(documentId: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/${documentId}/access-logs`);
  }

  async logDocumentAccess(documentId: string, action: string) {
    return this.client.post<ApiResponse<void>>(`${this.basePath}/documents/${documentId}/log-access`, { action });
  }

  // ============================================================================
  // Documents - Signatures
  // ============================================================================

  async listSignatureRequests() {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/signatures`);
  }

  async getSignatureRequest(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/signatures/${id}`);
  }

  async requestSignature(data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/signatures/request`, data);
  }

  async submitSignature(id: string, data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/signatures/${id}/sign`, data);
  }

  async declineSignature(id: string, reason: string) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/signatures/${id}/decline`, { reason });
  }

  // ============================================================================
  // Documents - Templates
  // ============================================================================

  async listTemplates(category?: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/templates`, { params: { category } });
  }

  async getTemplate(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/templates/${id}`);
  }

  async createTemplate(data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/templates`, data);
  }

  async updateTemplate(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(`${this.basePath}/documents/templates/${id}`, updates);
  }

  async deleteTemplate(id: string) {
    return this.client.delete<ApiResponse<void>>(`${this.basePath}/documents/templates/${id}`);
  }

  async generateFromTemplate(templateId: string, data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/templates/${templateId}/generate`, data);
  }

  // ============================================================================
  // Documents - Upload & Statistics
  // ============================================================================

  async uploadFile(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    return this.client.post<ApiResponse<any>>(`${this.basePath}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async getDocumentStatistics() {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/statistics`);
  }

  async getDocumentActivity(documentId: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/${documentId}/activity`);
  }

  async getUserDocumentActivity(userId: string, startDate: string, endDate: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/activity/user/${userId}`, {
      params: { startDate, endDate }
    });
  }

  async getExpiringDocuments(days: number = 30) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/documents/expiring`, { params: { days } });
  }

  // ============================================================================
  // Performance - Reviews
  // ============================================================================

  async listPerformanceReviews(filters?: any) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/reviews`, { params: filters });
  }

  async getPerformanceReview(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/reviews/${id}`);
  }

  async getEmployeeReviews(employeeId: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/reviews/employee/${employeeId}`);
  }

  async getReviewerReviews(reviewerId: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/reviews/reviewer/${reviewerId}`);
  }

  async createPerformanceReview(data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/performance/reviews`, data);
  }

  async updatePerformanceReview(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(`${this.basePath}/performance/reviews/${id}`, updates);
  }

  async deletePerformanceReview(id: string) {
    return this.client.delete<ApiResponse<void>>(`${this.basePath}/performance/reviews/${id}`);
  }

  async submitPerformanceReview(id: string) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/performance/reviews/${id}/submit`);
  }

  async getReviewStatistics() {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/reviews/statistics`);
  }

  // ============================================================================
  // Performance - Goals
  // ============================================================================

  async listGoals(filters?: any) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/goals`, { params: filters });
  }

  async getGoal(id: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/goals/${id}`);
  }

  async getEmployeeGoals(employeeId: string) {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/goals/employee/${employeeId}`);
  }

  async createGoal(data: any) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/performance/goals`, data);
  }

  async updateGoal(id: string, updates: any) {
    return this.client.put<ApiResponse<any>>(`${this.basePath}/performance/goals/${id}`, updates);
  }

  async deleteGoal(id: string) {
    return this.client.delete<ApiResponse<void>>(`${this.basePath}/performance/goals/${id}`);
  }

  async updateGoalProgress(id: string, progress: number) {
    return this.client.patch<ApiResponse<any>>(`${this.basePath}/performance/goals/${id}/progress`, { progress });
  }

  async completeGoal(id: string) {
    return this.client.post<ApiResponse<any>>(`${this.basePath}/performance/goals/${id}/complete`);
  }

  async getGoalStatistics() {
    return this.client.get<ApiResponse<any>>(`${this.basePath}/performance/goals/statistics`);
  }
}
