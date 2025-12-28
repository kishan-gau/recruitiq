import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const benefitsService = {
  async listBenefitPlans(filters?: any) {
    const response = await nexusClient.listBenefitPlans(filters);
    return response.data.benefitPlans || response.data;
  },

  async getBenefitPlan(id: string) {
    const response = await nexusClient.getBenefitPlan(id);
    return response.data.benefitPlan || response.data;
  },

  async createBenefitPlan(data: any) {
    const response = await nexusClient.createBenefitPlan(data);
    return response.data.benefitPlan || response.data;
  },

  async updateBenefitPlan(id: string, data: any) {
    const response = await nexusClient.updateBenefitPlan(id, data);
    return response.data.benefitPlan || response.data;
  },

  async deleteBenefitPlan(id: string) {
    await nexusClient.deleteBenefitPlan(id);
  },

  // TODO: Implement when NexusClient adds benefit enrollment support
  // The enrollInBenefitPlan method doesn't exist in NexusClient yet
  // Uncomment when backend API implements /api/products/nexus/benefits/enroll endpoint
  // async enrollEmployee(employeeId: string, planId: string, data?: any) {
  //   const response = await nexusClient.enrollInBenefitPlan(employeeId, planId, data);
  //   return response.data?.enrollment || response.data || {
  //     success: false,
  //     message: 'Enrollment service unavailable',
  //   };
  // },

  // TODO: Implement when NexusClient adds benefit eligibility checking
  // The checkBenefitEligibility method doesn't exist in NexusClient yet
  // Note: checkRehireEligibility exists but serves a different purpose (employee rehire, not benefits)
  // Uncomment when backend API implements /api/products/nexus/benefits/eligibility endpoint
  // async checkEligibility(employeeId: string, planId: string) {
  //   const response = await nexusClient.checkBenefitEligibility(employeeId, planId);
  //   return response.data?.eligibility || response.data || {
  //     eligible: false,
  //     reasons: ['Eligibility check unavailable'],
  //   };
  // },
};
