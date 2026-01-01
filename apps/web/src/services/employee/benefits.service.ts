/**
 * Benefits Service
 * Provides API integration for employee benefits management
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export interface BenefitPlan {
  id: string;
  name: string;
  category: 'health' | 'dental' | 'vision' | 'retirement' | 'life' | 'disability' | 'other';
  description: string;
  provider: string;
  cost: {
    employee: number;
    employer: number;
    total: number;
    frequency: 'monthly' | 'biweekly' | 'annual';
  };
  coverage: string;
  effectiveDate: string;
  expiryDate?: string;
}

export interface Enrollment {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'pending' | 'cancelled';
  enrolledAt: string;
  effectiveDate: string;
  dependents?: Array<{
    name: string;
    relationship: string;
  }>;
}

export interface BenefitsSummary {
  totalPlans: number;
  totalCost: number;
  employerContribution: number;
  employeeCost: number;
  categories: string[];
}

export const benefitsService = {
  /**
   * Get available benefit plans
   */
  async listAvailablePlans(): Promise<BenefitPlan[]> {
    const response = await nexusClient.listBenefitPlans();
    return response.data.plans || response.data || [];
  },

  /**
   * Get employee's enrolled benefits
   */
  async listEnrollments(): Promise<Enrollment[]> {
    const response = await nexusClient.listBenefitEnrollments();
    return response.data.enrollments || response.data || [];
  },

  /**
   * Get benefits summary
   */
  async getSummary(): Promise<BenefitsSummary> {
    const response = await nexusClient.getBenefitsSummary();
    return response.data.summary || response.data;
  },

  /**
   * Get enrollment details
   */
  async getEnrollment(id: string): Promise<Enrollment> {
    const response = await nexusClient.getBenefitEnrollment(id);
    return response.data.enrollment || response.data;
  },

  /**
   * Check eligibility for a plan
   */
  async checkEligibility(planId: string): Promise<{ eligible: boolean; reason?: string }> {
    const response = await nexusClient.checkBenefitEligibility(planId);
    return response.data;
  },

  /**
   * Enroll in a benefit plan
   */
  async enroll(planId: string, data: { dependents?: any[] }): Promise<Enrollment> {
    const response = await nexusClient.enrollInBenefit(planId, data);
    return response.data.enrollment || response.data;
  },

  /**
   * Cancel enrollment
   */
  async cancelEnrollment(enrollmentId: string, reason: string): Promise<void> {
    await nexusClient.cancelBenefitEnrollment(enrollmentId, { reason });
  }
};
