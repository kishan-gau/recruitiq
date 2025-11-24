/**
 * Benefits Service
 * API service for benefits plans, enrollments, and dependents management
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
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

// Create singleton instance
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const benefitsService = {
  // ============ Benefit Plans ============

  async listPlans(filters?: BenefitPlanFilters): Promise<BenefitPlan[]> {
    try {
      const response = await nexusClient.listBenefitPlans(filters);
      // Backend returns { success: true, data: { plans: [...], total, limit, offset } }
      if (response.data) {
        return Array.isArray(response.data) ? response.data : (response.data.plans || []);
      }
      return [];
    } catch (error) {
      console.error('[BenefitsService] Failed to list plans:', error);
      return [];
    }
  },

  async getPlan(id: string): Promise<BenefitPlan> {
    const response = await nexusClient.getBenefitPlan(id);
    return response.data as BenefitPlan;
  },

  async createPlan(data: CreateBenefitPlanDTO): Promise<BenefitPlan> {
    const response = await nexusClient.createBenefitPlan(data);
    return response.data as BenefitPlan;
  },

  async updatePlan(id: string, updates: UpdateBenefitPlanDTO): Promise<BenefitPlan> {
    const response = await nexusClient.updateBenefitPlan(id, updates);
    return response.data as BenefitPlan;
  },

  async deletePlan(id: string): Promise<void> {
    await nexusClient.deleteBenefitPlan(id);
  },

  async getStatistics(): Promise<BenefitStatistics> {
    const response = await nexusClient.getBenefitStatistics();
    return response.data as BenefitStatistics;
  },

  async getEnrollmentSummary(planId: string): Promise<EnrollmentSummary> {
    const response = await nexusClient.getPlanEnrollmentSummary(planId);
    return response.data as EnrollmentSummary;
  },

  // ============ Enrollments ============

  async listEnrollments(filters?: BenefitEnrollmentFilters): Promise<BenefitEnrollment[]> {
    try {
      const response = await nexusClient.listBenefitEnrollments(filters);
      if (response.data) {
        return Array.isArray(response.data) ? response.data : (response.data.enrollments || []);
      }
      return [];
    } catch (error) {
      console.error('[BenefitsService] Failed to list enrollments:', error);
      return [];
    }
  },

  async getEnrollment(id: string): Promise<BenefitEnrollment> {
    const response = await nexusClient.getBenefitEnrollment(id);
    return response.data as BenefitEnrollment;
  },

  async getEmployeeEnrollments(employeeId: string): Promise<BenefitEnrollment[]> {
    try {
      const response = await nexusClient.getEmployeeBenefitEnrollments(employeeId);
      // Handle both response.data.enrollments and response.data array formats
      if (response.data) {
        return Array.isArray(response.data) ? response.data : (response.data.enrollments || []);
      }
      return [];
    } catch (error) {
      console.error('[BenefitsService] Failed to fetch employee enrollments:', error);
      return []; // Return empty array on error instead of undefined
    }
  },

  async createEnrollment(data: CreateBenefitEnrollmentDTO): Promise<BenefitEnrollment> {
    const response = await nexusClient.createBenefitEnrollment(data);
    return response.data as BenefitEnrollment;
  },

  async updateEnrollment(id: string, updates: UpdateBenefitEnrollmentDTO): Promise<BenefitEnrollment> {
    const response = await nexusClient.updateBenefitEnrollment(id, updates);
    return response.data as BenefitEnrollment;
  },

  async cancelEnrollment(id: string, reason: string): Promise<BenefitEnrollment> {
    const response = await nexusClient.cancelBenefitEnrollment(id, reason);
    return response.data as BenefitEnrollment;
  },

  async deleteEnrollment(id: string): Promise<void> {
    await nexusClient.deleteBenefitEnrollment(id);
  },

  // ============ Dependents ============

  async listDependents(filters?: DependentFilters): Promise<Dependent[]> {
    try {
      const response = await nexusClient.listDependents(filters);
      if (response.data) {
        return Array.isArray(response.data) ? response.data : (response.data.dependents || []);
      }
      return [];
    } catch (error) {
      console.error('[BenefitsService] Failed to list dependents:', error);
      return [];
    }
  },

  async getDependent(id: string): Promise<Dependent> {
    const response = await nexusClient.getDependent(id);
    return response.data as Dependent;
  },

  async getEmployeeDependents(employeeId: string): Promise<Dependent[]> {
    try {
      const response = await nexusClient.getEmployeeDependents(employeeId);
      if (response.data) {
        return Array.isArray(response.data) ? response.data : (response.data.dependents || []);
      }
      return [];
    } catch (error) {
      console.error('[BenefitsService] Failed to fetch employee dependents:', error);
      return [];
    }
  },

  async createDependent(data: CreateDependentDTO): Promise<Dependent> {
    const response = await nexusClient.createDependent(data);
    return response.data as Dependent;
  },

  async updateDependent(id: string, updates: UpdateDependentDTO): Promise<Dependent> {
    const response = await nexusClient.updateDependent(id, updates);
    return response.data as Dependent;
  },

  async deleteDependent(id: string): Promise<void> {
    await nexusClient.deleteDependent(id);
  },
};
