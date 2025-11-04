import { APIClient } from '../core/client';

/**
 * RecruitIQ Product API
 * ATS (Applicant Tracking System) specific endpoints
 */
export class RecruitIQAPI {
  constructor(private client: APIClient) {}

  // ============================================================================
  // Organization
  // ============================================================================

  async getOrganization() {
    return this.client.get('/organizations');
  }

  async updateOrganization(data: any) {
    return this.client.put('/organizations', data);
  }

  async getOrganizationStats() {
    return this.client.get('/organizations/stats');
  }

  // ============================================================================
  // Workspaces
  // ============================================================================

  async getWorkspaces() {
    return this.client.get('/workspaces');
  }

  async getWorkspace(id: string) {
    return this.client.get(`/workspaces/${id}`);
  }

  async createWorkspace(data: any) {
    return this.client.post('/workspaces', data);
  }

  async updateWorkspace(id: string, data: any) {
    return this.client.put(`/workspaces/${id}`, data);
  }

  async deleteWorkspace(id: string) {
    return this.client.delete(`/workspaces/${id}`);
  }

  async getWorkspaceMembers(id: string) {
    return this.client.get(`/workspaces/${id}/members`);
  }

  async addWorkspaceMember(workspaceId: string, userId: string) {
    return this.client.post(`/workspaces/${workspaceId}/members`, { userId });
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    return this.client.delete(`/workspaces/${workspaceId}/members/${userId}`);
  }

  // ============================================================================
  // Users
  // ============================================================================

  async getUsers(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/users${query ? '?' + query : ''}`);
  }

  async getUser(id: string) {
    return this.client.get(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.client.post('/users', data);
  }

  async updateUser(id: string, data: any) {
    return this.client.put(`/users/${id}`, data);
  }

  async updateUserRole(id: string, role: string) {
    return this.client.patch(`/users/${id}/role`, { role });
  }

  async deleteUser(id: string) {
    return this.client.delete(`/users/${id}`);
  }

  // ============================================================================
  // Jobs
  // ============================================================================

  async getJobs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/jobs${query ? '?' + query : ''}`);
  }

  async getJob(id: string) {
    return this.client.get(`/jobs/${id}`);
  }

  async createJob(data: any) {
    return this.client.post('/jobs', data);
  }

  async updateJob(id: string, data: any) {
    return this.client.put(`/jobs/${id}`, data);
  }

  async deleteJob(id: string) {
    return this.client.delete(`/jobs/${id}`);
  }

  async getPublicJobs() {
    return this.client.get('/jobs/public', {
      headers: { 'skip-auth': 'true' },
    });
  }

  async getPublicJob(id: string) {
    return this.client.get(`/jobs/public/${id}`, {
      headers: { 'skip-auth': 'true' },
    });
  }

  // ============================================================================
  // Candidates
  // ============================================================================

  async getCandidates(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/candidates${query ? '?' + query : ''}`);
  }

  async getCandidate(id: string) {
    return this.client.get(`/candidates/${id}`);
  }

  async createCandidate(data: any) {
    return this.client.post('/candidates', data);
  }

  async updateCandidate(id: string, data: any) {
    return this.client.put(`/candidates/${id}`, data);
  }

  async deleteCandidate(id: string) {
    return this.client.delete(`/candidates/${id}`);
  }

  async getCandidateApplications(id: string) {
    return this.client.get(`/candidates/${id}/applications`);
  }

  // ============================================================================
  // Applications
  // ============================================================================

  async getApplications(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/applications${query ? '?' + query : ''}`);
  }

  async getApplication(id: string) {
    return this.client.get(`/applications/${id}`);
  }

  async createApplication(data: any) {
    return this.client.post('/applications', data, {
      headers: { 'skip-auth': 'true' },
    });
  }

  async updateApplication(id: string, data: any) {
    return this.client.put(`/applications/${id}`, data);
  }

  async deleteApplication(id: string) {
    return this.client.delete(`/applications/${id}`);
  }

  async trackApplication(trackingCode: string) {
    return this.client.get(`/applications/track/${trackingCode}`, {
      headers: { 'skip-auth': 'true' },
    });
  }

  // ============================================================================
  // Interviews
  // ============================================================================

  async getInterviews(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/interviews${query ? '?' + query : ''}`);
  }

  async getInterview(id: string) {
    return this.client.get(`/interviews/${id}`);
  }

  async createInterview(data: any) {
    return this.client.post('/interviews', data);
  }

  async updateInterview(id: string, data: any) {
    return this.client.put(`/interviews/${id}`, data);
  }

  async deleteInterview(id: string) {
    return this.client.delete(`/interviews/${id}`);
  }

  async submitInterviewFeedback(id: string, feedback: any) {
    return this.client.post(`/interviews/${id}/feedback`, feedback);
  }

  // ============================================================================
  // Flow Templates
  // ============================================================================

  async getFlowTemplates(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`/flow-templates${query ? '?' + query : ''}`);
  }

  async getFlowTemplate(id: string) {
    return this.client.get(`/flow-templates/${id}`);
  }

  async createFlowTemplate(data: any) {
    return this.client.post('/flow-templates', data);
  }

  async updateFlowTemplate(id: string, data: any) {
    return this.client.put(`/flow-templates/${id}`, data);
  }

  async deleteFlowTemplate(id: string) {
    return this.client.delete(`/flow-templates/${id}`);
  }

  async cloneFlowTemplate(id: string) {
    return this.client.post(`/flow-templates/${id}/clone`);
  }
}
