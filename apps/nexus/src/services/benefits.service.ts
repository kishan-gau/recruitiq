/**
 * Benefits Service
 * API service for benefits plans, enrollments, and dependents management
 */

import { apiClient } from './api';
import type {
  BenefitPlan,
  CreateBenefitPlanDTO,
  UpdateBenefitPlanDTO,
  BenefitPlanFilters,
  BenefitEnrollment,
  CreateBenefitEnrollmentDTO,
  UpdateBenefitEnrollmentDTO,
  BenefitEnrollmentFilters,
  Dependent,
  CreateDependentDTO,
  UpdateDependentDTO,
  DependentFilters,
  BenefitStatistics,
  EnrollmentSummary,
} from '@/types/benefits.types';

// ============ Benefit Plans ============

export const benefitsService = {
  // Plan Operations
  async listPlans(filters?: BenefitPlanFilters): Promise<BenefitPlan[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.providerName) params.append('providerName', filters.providerName);
    
    const queryString = params.toString();
    return apiClient.get(`/benefits/plans${queryString ? `?${queryString}` : ''}`);
  },

  async getPlan(id: string): Promise<BenefitPlan> {
    return apiClient.get(`/benefits/plans/${id}`);
  },

  async createPlan(data: CreateBenefitPlanDTO): Promise<BenefitPlan> {
    return apiClient.post('/benefits/plans', data);
  },

  async updatePlan(id: string, updates: UpdateBenefitPlanDTO): Promise<BenefitPlan> {
    return apiClient.put(`/benefits/plans/${id}`, updates);
  },

  async deletePlan(id: string): Promise<void> {
    return apiClient.delete(`/benefits/plans/${id}`);
  },

  async getStatistics(): Promise<BenefitStatistics> {
    return apiClient.get('/benefits/statistics');
  },

  async getEnrollmentSummary(planId: string): Promise<EnrollmentSummary> {
    return apiClient.get(`/benefits/plans/${planId}/enrollment-summary`);
  },

  // Enrollment Operations
  async listEnrollments(filters?: BenefitEnrollmentFilters): Promise<BenefitEnrollment[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.planId) params.append('planId', filters.planId);
    if (filters?.enrollmentStatus) params.append('enrollmentStatus', filters.enrollmentStatus);
    if (filters?.category) params.append('category', filters.category);
    
    const queryString = params.toString();
    return apiClient.get(`/benefits/enrollments${queryString ? `?${queryString}` : ''}`);
  },

  async getEnrollment(id: string): Promise<BenefitEnrollment> {
    return apiClient.get(`/benefits/enrollments/${id}`);
  },

  async getEmployeeEnrollments(employeeId: string): Promise<BenefitEnrollment[]> {
    return apiClient.get(`/benefits/enrollments/employee/${employeeId}`);
  },

  async createEnrollment(data: CreateBenefitEnrollmentDTO): Promise<BenefitEnrollment> {
    return apiClient.post('/benefits/enrollments', data);
  },

  async updateEnrollment(id: string, updates: UpdateBenefitEnrollmentDTO): Promise<BenefitEnrollment> {
    return apiClient.put(`/benefits/enrollments/${id}`, updates);
  },

  async cancelEnrollment(id: string, reason: string): Promise<BenefitEnrollment> {
    return apiClient.put(`/benefits/enrollments/${id}/cancel`, { reason });
  },

  async deleteEnrollment(id: string): Promise<void> {
    return apiClient.delete(`/benefits/enrollments/${id}`);
  },

  // Dependent Operations
  async listDependents(filters?: DependentFilters): Promise<Dependent[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.relationship) params.append('relationship', filters.relationship);
    
    const queryString = params.toString();
    return apiClient.get(`/benefits/dependents${queryString ? `?${queryString}` : ''}`);
  },

  async getDependent(id: string): Promise<Dependent> {
    return apiClient.get(`/benefits/dependents/${id}`);
  },

  async getEmployeeDependents(employeeId: string): Promise<Dependent[]> {
    return apiClient.get(`/benefits/dependents/employee/${employeeId}`);
  },

  async createDependent(data: CreateDependentDTO): Promise<Dependent> {
    return apiClient.post('/benefits/dependents', data);
  },

  async updateDependent(id: string, updates: UpdateDependentDTO): Promise<Dependent> {
    return apiClient.put(`/benefits/dependents/${id}`, updates);
  },

  async deleteDependent(id: string): Promise<void> {
    return apiClient.delete(`/benefits/dependents/${id}`);
  },
};
