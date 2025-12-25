/**
 * RecruitIQ Candidates Service
 * 
 * Wraps RecruitIQAPI candidates methods
 */
import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const candidatesService = {
  /**
   * Get all candidates with filters
   */
  async getCandidates(params = {}) {
    const response = await recruitiqClient.getCandidates(params);
    return response.candidates || response.data;
  },

  /**
   * Get candidate by ID
   */
  async getCandidate(id) {
    const response = await recruitiqClient.getCandidate(id);
    return response.candidate || response.data;
  },

  /**
   * Create new candidate
   */
  async createCandidate(data) {
    const response = await recruitiqClient.createCandidate(data);
    return response.candidate || response.data;
  },

  /**
   * Update candidate
   */
  async updateCandidate(id, data) {
    const response = await recruitiqClient.updateCandidate(id, data);
    return response.candidate || response.data;
  },

  /**
   * Delete candidate
   */
  async deleteCandidate(id) {
    const response = await recruitiqClient.deleteCandidate(id);
    return response;
  },

  /**
   * Get candidate applications
   */
  async getCandidateApplications(candidateId) {
    const response = await recruitiqClient.getCandidateApplications(candidateId);
    return response.applications || response.data;
  },

  /**
   * Search candidates
   */
  async searchCandidates(query, filters = {}) {
    const response = await recruitiqClient.getCandidates({ search: query, ...filters });
    return response.candidates || response.data;
  },
};