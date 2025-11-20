import { APIClient } from '../core/client';

/**
 * RecruitIQ Product API
 * ATS (Applicant Tracking System) specific endpoints
 */
export class RecruitIQAPI {
  private readonly organizationsPath = 'organizations';
  private readonly workspacesPath = 'workspaces';
  private readonly usersPath = 'users';
  private readonly jobsPath = 'jobs';
  private readonly candidatesPath = 'candidates';
  private readonly applicationsPath = 'applications';
  private readonly interviewsPath = 'interviews';
  private readonly flowTemplatesPath = 'flow-templates';

  constructor(private client: APIClient) {}

  // ============================================================================
  // Organization
  // ============================================================================

  async getOrganization() {
    return this.client.get(`${this.organizationsPath}`);
  }

  async updateOrganization(data: any) {
    return this.client.put(`${this.organizationsPath}`, data);
  }

  async getOrganizationStats() {
    return this.client.get(`${this.organizationsPath}/stats`);
  }

  // ============================================================================
  // Workspaces
  // ============================================================================

  async getWorkspaces() {
    return this.client.get(`${this.workspacesPath}`);
  }

  async getWorkspace(id: string) {
    return this.client.get(`${this.workspacesPath}/${id}`);
  }

  async createWorkspace(data: any) {
    return this.client.post(`${this.workspacesPath}`, data);
  }

  async updateWorkspace(id: string, data: any) {
    return this.client.put(`${this.workspacesPath}/${id}`, data);
  }

  async deleteWorkspace(id: string) {
    return this.client.delete(`${this.workspacesPath}/${id}`);
  }

  async getWorkspaceMembers(id: string) {
    return this.client.get(`${this.workspacesPath}/${id}/members`);
  }

  async addWorkspaceMember(workspaceId: string, userId: string) {
    return this.client.post(`${this.workspacesPath}/${workspaceId}/members`, { userId });
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    return this.client.delete(`${this.workspacesPath}/${workspaceId}/members/${userId}`);
  }

  // ============================================================================
  // Users
  // ============================================================================

  async getUsers(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.usersPath}${query ? '?' + query : ''}`);
  }

  async getUser(id: string) {
    return this.client.get(`${this.usersPath}/${id}`);
  }

  async createUser(data: any) {
    return this.client.post(`${this.usersPath}`, data);
  }

  async updateUser(id: string, data: any) {
    return this.client.put(`${this.usersPath}/${id}`, data);
  }

  async updateUserRole(id: string, role: string) {
    return this.client.patch(`${this.usersPath}/${id}/role`, { role });
  }

  async deleteUser(id: string) {
    return this.client.delete(`${this.usersPath}/${id}`);
  }

  // ============================================================================
  // Jobs
  // ============================================================================

  async getJobs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.jobsPath}${query ? '?' + query : ''}`);
  }

  async getJob(id: string) {
    return this.client.get(`${this.jobsPath}/${id}`);
  }

  async createJob(data: any) {
    return this.client.post(`${this.jobsPath}`, data);
  }

  async updateJob(id: string, data: any) {
    return this.client.put(`${this.jobsPath}/${id}`, data);
  }

  async deleteJob(id: string) {
    return this.client.delete(`${this.jobsPath}/${id}`);
  }

  async getPublicJobs() {
    return this.client.get(`${this.jobsPath}/public`, {
      headers: { 'skip-auth': 'true' },
    });
  }

  async getPublicJob(id: string) {
    return this.client.get(`${this.jobsPath}/public/${id}`, {
      headers: { 'skip-auth': 'true' },
    });
  }

  // ============================================================================
  // Candidates
  // ============================================================================

  async getCandidates(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.candidatesPath}${query ? '?' + query : ''}`);
  }

  async getCandidate(id: string) {
    return this.client.get(`${this.candidatesPath}/${id}`);
  }

  async createCandidate(data: any) {
    return this.client.post(`${this.candidatesPath}`, data);
  }

  async updateCandidate(id: string, data: any) {
    return this.client.put(`${this.candidatesPath}/${id}`, data);
  }

  async deleteCandidate(id: string) {
    return this.client.delete(`${this.candidatesPath}/${id}`);
  }

  async getCandidateApplications(id: string) {
    return this.client.get(`${this.candidatesPath}/${id}/applications`);
  }

  // ============================================================================
  // Applications
  // ============================================================================

  async getApplications(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.applicationsPath}${query ? '?' + query : ''}`);
  }

  async getApplication(id: string) {
    return this.client.get(`${this.applicationsPath}/${id}`);
  }

  async createApplication(data: any) {
    return this.client.post(`${this.applicationsPath}`, data, {
      headers: { 'skip-auth': 'true' },
    });
  }

  async updateApplication(id: string, data: any) {
    return this.client.put(`${this.applicationsPath}/${id}`, data);
  }

  async deleteApplication(id: string) {
    return this.client.delete(`${this.applicationsPath}/${id}`);
  }

  async trackApplication(trackingCode: string) {
    return this.client.get(`${this.applicationsPath}/track/${trackingCode}`, {
      headers: { 'skip-auth': 'true' },
    });
  }

  // ============================================================================
  // Interviews
  // ============================================================================

  async getInterviews(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.interviewsPath}${query ? '?' + query : ''}`);
  }

  async getInterview(id: string) {
    return this.client.get(`${this.interviewsPath}/${id}`);
  }

  async createInterview(data: any) {
    return this.client.post(`${this.interviewsPath}`, data);
  }

  async updateInterview(id: string, data: any) {
    return this.client.put(`${this.interviewsPath}/${id}`, data);
  }

  async deleteInterview(id: string) {
    return this.client.delete(`${this.interviewsPath}/${id}`);
  }

  async submitInterviewFeedback(id: string, feedback: any) {
    return this.client.post(`${this.interviewsPath}/${id}/feedback`, feedback);
  }

  // ============================================================================
  // Flow Templates
  // ============================================================================

  async getFlowTemplates(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.client.get(`${this.flowTemplatesPath}${query ? '?' + query : ''}`);
  }

  async getFlowTemplate(id: string) {
    return this.client.get(`${this.flowTemplatesPath}/${id}`);
  }

  async createFlowTemplate(data: any) {
    return this.client.post(`${this.flowTemplatesPath}`, data);
  }

  async updateFlowTemplate(id: string, data: any) {
    return this.client.put(`${this.flowTemplatesPath}/${id}`, data);
  }

  async deleteFlowTemplate(id: string) {
    return this.client.delete(`${this.flowTemplatesPath}/${id}`);
  }

  async cloneFlowTemplate(id: string) {
    return this.client.post(`${this.flowTemplatesPath}/${id}/clone`);
  }
}
