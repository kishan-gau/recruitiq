import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const pipelineService = {
  /**
   * Gets recruitment pipeline stages and candidates
   */
  async getPipeline(filters?: {
    jobId?: string;
    startDate?: string;
    endDate?: string;
    stageId?: string;
  }) {
    const response = await recruitiqClient.getRecruitmentPipeline(filters);
    return response.pipeline || response.data;
  },

  /**
   * Lists all pipeline stages
   */
  async getStages() {
    const response = await recruitiqClient.getPipelineStages();
    return response.stages || response.data;
  },

  /**
   * Creates a new pipeline stage
   */
  async createStage(data: {
    name: string;
    description?: string;
    order: number;
    color?: string;
    isDefault?: boolean;
  }) {
    const response = await recruitiqClient.createPipelineStage(data);
    return response.stage || response.data;
  },

  /**
   * Updates a pipeline stage
   */
  async updateStage(stageId: string, updates: Partial<any>) {
    const response = await recruitiqClient.updatePipelineStage(stageId, updates);
    return response.stage || response.data;
  },

  /**
   * Deletes a pipeline stage
   */
  async deleteStage(stageId: string) {
    await recruitiqClient.deletePipelineStage(stageId);
  },

  /**
   * Moves candidate to different stage
   */
  async moveCandidateToStage(candidateId: string, stageId: string, notes?: string) {
    const response = await recruitiqClient.moveCandidateToStage({
      candidateId,
      stageId,
      notes
    });
    return response.data || response;
  },

  /**
   * Gets pipeline analytics/metrics
   */
  async getPipelineAnalytics(filters?: {
    jobId?: string;
    dateRange?: string;
    includeConversionRates?: boolean;
  }) {
    const response = await recruitiqClient.getPipelineAnalytics(filters);
    return response.analytics || response.data;
  },

  /**
   * Gets pipeline templates
   */
  async getPipelineTemplates() {
    const response = await recruitiqClient.getPipelineTemplates();
    return response.templates || response.data;
  },

  /**
   * Creates a new pipeline template
   */
  async createPipelineTemplate(data: {
    name: string;
    description?: string;
    stages: Array<{
      name: string;
      description?: string;
      order: number;
      color?: string;
    }>;
  }) {
    const response = await recruitiqClient.createPipelineTemplate(data);
    return response.template || response.data;
  },

  /**
   * Applies a template to create new pipeline stages
   */
  async applyPipelineTemplate(templateId: string, jobId?: string) {
    const response = await recruitiqClient.applyPipelineTemplate(templateId, { jobId });
    return response.data || response;
  },

  /**
   * Gets candidate flow between stages (tracking)
   */
  async getCandidateFlow(candidateId: string) {
    const response = await recruitiqClient.getCandidateFlow(candidateId);
    return response.flow || response.data;
  },

  /**
   * Bulk move candidates between stages
   */
  async bulkMoveCandidates(data: {
    candidateIds: string[];
    targetStageId: string;
    notes?: string;
  }) {
    const response = await recruitiqClient.bulkMoveCandidates(data);
    return response.data || response;
  }
};