/**
 * VIP Employees API Service
 * Handles all VIP employee-related API calls
 * Uses @recruitiq/api-client for type-safe API calls
 */

import { APIClient } from '@recruitiq/api-client';
import type {
  VIPEmployee,
  VIPStatus,
  VIPAccessControl,
  VIPAccessLog,
  MarkAsVIPDTO,
  UpdateAccessControlDTO,
  VIPEmployeeFilters,
  VIPCount,
  VIPAccessCheck,
  VIPAuditLogFilters,
} from '@/types/vipEmployee.types';
import type { PaginatedResponse } from '@/types/common.types';

// Create singleton instance for service-level usage
const apiClient = new APIClient();
const API_BASE = '/api/products/nexus/vip-employees';

// Permission metadata for RBAC
export const vipEmployeesServicePermissions = {
  list: 'vip:read',
  view: 'vip:read',
  manage: 'vip:manage',
  viewAuditLog: 'vip:read',
};

export const vipEmployeesService = {
  /**
   * List all VIP employees with optional filters
   */
  list: async (filters?: VIPEmployeeFilters): Promise<{ vipEmployees: VIPEmployee[], pagination: PaginatedResponse<VIPEmployee>['pagination'] }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isRestricted !== undefined) params.append('isRestricted', String(filters.isRestricted));
    if (filters?.restrictionLevel) params.append('restrictionLevel', filters.restrictionLevel);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
    
    const response = await apiClient.get(url);
    return {
      vipEmployees: response.vipEmployees || [],
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  /**
   * Get VIP employee count statistics
   */
  getCount: async (): Promise<VIPCount> => {
    const response = await apiClient.get(`${API_BASE}/count`);
    return response.count || { totalVip: 0, restricted: 0, unrestricted: 0 };
  },

  /**
   * Get VIP status for a specific employee
   */
  getStatus: async (employeeId: string): Promise<VIPStatus> => {
    const response = await apiClient.get(`${API_BASE}/${employeeId}`);
    return response.vipStatus as VIPStatus;
  },

  /**
   * Mark an employee as VIP
   */
  markAsVIP: async (employeeId: string, data: MarkAsVIPDTO): Promise<VIPEmployee> => {
    const response = await apiClient.post(`${API_BASE}/${employeeId}`, data);
    return response.vipEmployee as VIPEmployee;
  },

  /**
   * Update VIP status settings
   */
  updateStatus: async (employeeId: string, data: MarkAsVIPDTO): Promise<VIPEmployee> => {
    const response = await apiClient.patch(`${API_BASE}/${employeeId}`, data);
    return response.vipEmployee as VIPEmployee;
  },

  /**
   * Update access control rules for a VIP employee
   */
  updateAccessControl: async (employeeId: string, data: UpdateAccessControlDTO): Promise<VIPAccessControl> => {
    const response = await apiClient.patch(`${API_BASE}/${employeeId}/access-control`, data);
    return response.accessControl as VIPAccessControl;
  },

  /**
   * Remove VIP status from an employee
   */
  removeVIPStatus: async (employeeId: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/${employeeId}`);
  },

  /**
   * Get audit log for VIP employee access attempts
   */
  getAuditLog: async (employeeId: string, filters?: VIPAuditLogFilters): Promise<{ auditLog: VIPAccessLog[], pagination: PaginatedResponse<VIPAccessLog>['pagination'] }> => {
    const params = new URLSearchParams();
    if (filters?.accessType) params.append('accessType', filters.accessType);
    if (filters?.accessGranted !== undefined) params.append('accessGranted', String(filters.accessGranted));
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/${employeeId}/audit-log?${queryString}` : `${API_BASE}/${employeeId}/audit-log`;
    
    const response = await apiClient.get(url);
    return {
      auditLog: response.auditLog || [],
      pagination: response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
    };
  },

  /**
   * Check if current user has access to a VIP employee
   */
  checkAccess: async (employeeId: string, accessType?: string): Promise<VIPAccessCheck> => {
    const params = accessType ? `?accessType=${accessType}` : '';
    const response = await apiClient.get(`${API_BASE}/${employeeId}/check-access${params}`);
    return response.access as VIPAccessCheck;
  },
};
