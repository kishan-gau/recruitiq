import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const candidatesService = {
  /**
   * Lists all candidates with optional filters and pagination
   */
  async listCandidates(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
    jobId?: string;
    source?: string;
    status?: string;
  }) {
    const response = await recruitiqClient.getCandidates(filters);
    return response.candidates || response.data;
  },

  /**
   * Gets a single candidate by ID
   */
  async getCandidate(id: string) {
    const response = await recruitiqClient.getCandidate(id);
    return response.candidate || response.data;
  },

  /**
   * Creates a new candidate
   */
  async createCandidate(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    coverLetter?: string;
    jobId?: string;
    source?: string;
    linkedInUrl?: string;
    portfolioUrl?: string;
  }) {
    const response = await recruitiqClient.createCandidate(data);
    return response.candidate || response.data;
  },

  /**
   * Updates an existing candidate
   */
  async updateCandidate(id: string, updates: Partial<any>) {
    const response = await recruitiqClient.updateCandidate(id, updates);
    return response.candidate || response.data;
  },

  /**
   * Deletes a candidate (soft delete)
   */
  async deleteCandidate(id: string) {
    await recruitiqClient.deleteCandidate(id);
  },

  /**
   * Gets candidate applications
   */
  async getCandidateApplications(candidateId: string) {
    const response = await recruitiqClient.getCandidateApplications(candidateId);
    return response.applications || response.data;
  },

  /**
   * Creates an application for a candidate
   */
  async createApplication(candidateId: string, jobId: string, data?: {
    coverLetter?: string;
    resumeUrl?: string;
    source?: string;
  }) {
    const response = await recruitiqClient.createApplication({
      candidateId,
      jobId,
      ...data
    });
    return response.application || response.data;
  },

  /**
   * Updates application status/stage
   */
  async updateApplication(applicationId: string, updates: {
    stage?: string;
    status?: string;
    notes?: string;
  }) {
    const response = await recruitiqClient.updateApplication(applicationId, updates);
    return response.application || response.data;
  },

  /**
   * Gets candidate statistics for dashboard
   */
  async getCandidateStatistics() {
    const response = await recruitiqClient.getCandidateStatistics();
    return response.data || response;
  },

  /**
   * Uploads candidate resume/CV
   */
  async uploadResume(candidateId: string, file: File) {
    const response = await recruitiqClient.uploadCandidateResume(candidateId, file);
    return response.data || response;
  },

  /**
   * Downloads candidate resume/CV
   */
  async downloadResume(candidateId: string) {
    const response = await recruitiqClient.downloadCandidateResume(candidateId);
    return response.data || response;
  },

  /**
   * Bulk import candidates
   */
  async bulkImport(data: any[]) {
    const response = await recruitiqClient.bulkImportCandidates(data);
    return response.data || response;
  }
};