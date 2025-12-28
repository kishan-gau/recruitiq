import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const dashboardService = {
  /**
   * Gets overall recruitment dashboard metrics
   */
  async getDashboardMetrics(filters?: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    jobId?: string;
    departmentId?: string;
  }) {
    const response = await recruitiqClient.getRecruitmentMetrics(filters);
    return response.metrics || response.data;
  },

  /**
   * Gets job posting statistics
   */
  async getJobStatistics(filters?: {
    status?: string;
    dateRange?: string;
    departmentId?: string;
  }) {
    const response = await recruitiqClient.getJobStatistics(filters);
    return response.statistics || response.data;
  },

  /**
   * Gets candidate statistics
   */
  async getCandidateStatistics(filters?: {
    stage?: string;
    source?: string;
    dateRange?: string;
    jobId?: string;
  }) {
    const response = await recruitiqClient.getCandidateStatistics(filters);
    return response.statistics || response.data;
  },

  /**
   * Gets application statistics
   */
  async getApplicationStatistics(filters?: {
    status?: string;
    dateRange?: string;
    jobId?: string;
  }) {
    const response = await recruitiqClient.getApplicationStatistics(filters);
    return response.statistics || response.data;
  },

  /**
   * Gets pipeline conversion rates
   */
  async getConversionRates(filters?: {
    jobId?: string;
    dateRange?: string;
    stageFrom?: string;
    stageTo?: string;
  }) {
    const response = await recruitiqClient.getPipelineConversionRates(filters);
    return response.conversionRates || response.data;
  },

  /**
   * Gets time-to-hire metrics
   */
  async getTimeToHireMetrics(filters?: {
    jobId?: string;
    dateRange?: string;
    departmentId?: string;
  }) {
    const response = await recruitiqClient.getTimeToHireMetrics(filters);
    return response.metrics || response.data;
  },

  /**
   * Gets source effectiveness data
   */
  async getSourceEffectiveness(filters?: {
    dateRange?: string;
    jobId?: string;
    includeConversionRates?: boolean;
  }) {
    const response = await recruitiqClient.getSourceEffectiveness(filters);
    return response.data || response;
  },

  /**
   * Gets recent activities for dashboard feed
   */
  async getRecentActivities(filters?: {
    limit?: number;
    offset?: number;
    activityType?: string;
    userId?: string;
  }) {
    const response = await recruitiqClient.getRecruitmentActivities(filters);
    return response.activities || response.data;
  },

  /**
   * Gets hiring velocity metrics
   */
  async getHiringVelocity(filters?: {
    dateRange?: string;
    departmentId?: string;
    compareToLastPeriod?: boolean;
  }) {
    const response = await recruitiqClient.getHiringVelocity(filters);
    return response.velocity || response.data;
  },

  /**
   * Gets cost-per-hire metrics
   */
  async getCostPerHire(filters?: {
    jobId?: string;
    dateRange?: string;
    departmentId?: string;
  }) {
    const response = await recruitiqClient.getCostPerHire(filters);
    return response.metrics || response.data;
  },

  /**
   * Gets diversity metrics
   */
  async getDiversityMetrics(filters?: {
    dateRange?: string;
    jobId?: string;
    departmentId?: string;
  }) {
    const response = await recruitiqClient.getDiversityMetrics(filters);
    return response.metrics || response.data;
  },

  /**
   * Gets performance insights and recommendations
   */
  async getPerformanceInsights(filters?: {
    dateRange?: string;
    includeRecommendations?: boolean;
  }) {
    const response = await recruitiqClient.getPerformanceInsights(filters);
    return response.insights || response.data;
  }
};