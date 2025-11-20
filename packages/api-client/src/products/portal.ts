import { APIClient } from '../core/client';

/**
 * Portal (Admin) API
 * Platform administration and management endpoints
 */
export class PortalAPI {
  private readonly adminPath = 'admin';
  private readonly tiersPath = 'tiers';
  private readonly securityPath = 'security';
  private readonly deploymentsPath = 'deployments';
  private readonly infrastructurePath = 'infrastructure';
  private readonly portalPath = 'portal';
  private readonly logsPath = 'logs';

  constructor(private client: APIClient) {}

  // ============================================================================
  // Dashboard & Analytics
  // ============================================================================

  async getDashboardMetrics() {
    const response = await this.client.get(`${this.adminPath}/dashboard`);
    return response.metrics;
  }

  async getUpcomingRenewals(_days: number = 60) {
    const response = await this.client.get(`${this.adminPath}/dashboard`);
    return response.upcomingRenewals || [];
  }

  async getAnalytics(period: string = '30d') {
    return this.client.get(`${this.adminPath}/analytics?period=${period}`);
  }

  // ============================================================================
  // Customer/License Management
  // ============================================================================

  async getCustomers(filters: Record<string, any> = {}) {
    const params = new URLSearchParams();
    if (filters.tier && filters.tier !== 'all') params.append('tier', filters.tier);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.deploymentType && filters.deploymentType !== 'all')
      params.append('deploymentType', filters.deploymentType);
    if (filters.search) params.append('search', filters.search);

    return this.client.get(`${this.adminPath}/customers?${params.toString()}`);
  }

  async getCustomer(id: string) {
    return this.client.get(`${this.adminPath}/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.client.post(`${this.adminPath}/customers`, data);
  }

  async updateCustomer(id: string, data: any) {
    return this.client.put(`${this.adminPath}/customers/${id}`, data);
  }

  async deleteCustomer(id: string) {
    return this.client.delete(`${this.adminPath}/customers/${id}`);
  }

  async getCustomerUsage(id: string, days: number = 30) {
    return this.client.get(`${this.adminPath}/customers/${id}/usage?days=${days}`);
  }

  async getCustomerActivity(id: string, limit: number = 10) {
    return this.client.get(`${this.adminPath}/customers/${id}/activity?limit=${limit}`);
  }

  // ============================================================================
  // License Operations
  // ============================================================================

  async renewLicense(customerId: string, months: number = 12) {
    return this.client.post(`${this.adminPath}/licenses/${customerId}/renew`, { months });
  }

  async suspendLicense(customerId: string) {
    return this.client.post(`${this.adminPath}/licenses/${customerId}/suspend`);
  }

  async reactivateLicense(customerId: string) {
    return this.client.post(`${this.adminPath}/licenses/${customerId}/reactivate`);
  }

  async downloadLicenseFile(customerId: string) {
    const response = await this.client.get(`${this.adminPath}/licenses/${customerId}/download`);
    
    // Create download
    const blob = new Blob([JSON.stringify(response, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruitiq-license-${customerId}.lic`;
    a.click();
    window.URL.revokeObjectURL(url);

    return response;
  }

  // ============================================================================
  // Tier Management
  // ============================================================================

  async getTiers() {
    return this.client.get(`${this.tiersPath}`);
  }

  async getTierHistory(tierName: string) {
    return this.client.get(`${this.tiersPath}/${tierName}/history`);
  }

  async getTierStats() {
    return this.client.get(`${this.tiersPath}/stats`);
  }

  async createTierVersion(tierData: any, autoMigrate: boolean = false) {
    return this.client.post(`${this.tiersPath}/create-version`, {
      ...tierData,
      autoMigrate,
    });
  }

  async previewTierMigration(tierName: string, filters: Record<string, any> = {}) {
    return this.client.post(`${this.tiersPath}/${tierName}/preview-migration`, filters);
  }

  async executeTierMigration(migrationId: string, filters: Record<string, any> = {}) {
    return this.client.post(`${this.tiersPath}/migrations/${migrationId}/execute`, filters);
  }

  async getMigrationHistory(tierName: string | null = null) {
    const params = tierName ? { tierName } : {};
    return this.client.get(`${this.tiersPath}/migrations/history`, { params });
  }

  // ============================================================================
  // Security Monitoring
  // ============================================================================

  async getSecurityDashboard() {
    return this.client.get(`${this.securityPath}/dashboard`);
  }

  async getSecurityEvents(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.securityPath}/events?${params.toString()}`);
  }

  async getSecurityAlerts(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.securityPath}/alerts?${params.toString()}`);
  }

  async acknowledgeAlert(alertId: string) {
    return this.client.post(`${this.securityPath}/alerts/${alertId}/acknowledge`);
  }

  async resolveAlert(alertId: string) {
    return this.client.post(`${this.securityPath}/alerts/${alertId}/resolve`);
  }

  // ============================================================================
  // Deployment Management
  // ============================================================================

  async deployInstance(deploymentData: any) {
    return this.client.post(`${this.deploymentsPath}`, deploymentData);
  }

  async getDeploymentStatus(jobId: string) {
    return this.client.get(`${this.deploymentsPath}/${jobId}`);
  }

  async cancelDeployment(jobId: string) {
    return this.client.delete(`${this.deploymentsPath}/${jobId}`);
  }

  async getDeploymentStats() {
    return this.client.get(`${this.deploymentsPath}/stats`);
  }

  // ============================================================================
  // Infrastructure/VPS Management
  // ============================================================================

  async getVPSInstances() {
    return this.client.get(`${this.infrastructurePath}/vps`);
  }

  async getVPSInstance(vpsName: string) {
    return this.client.get(`${this.infrastructurePath}/vps/${vpsName}`);
  }

  async createVPSInstance(data: any) {
    return this.client.post(`${this.infrastructurePath}/vps`, data);
  }

  async deleteVPSInstance(vpsName: string) {
    return this.client.delete(`${this.infrastructurePath}/vps/${vpsName}`);
  }

  async startVPSInstance(vpsName: string) {
    return this.client.post(`${this.infrastructurePath}/vps/${vpsName}/start`);
  }

  async stopVPSInstance(vpsName: string) {
    return this.client.post(`${this.infrastructurePath}/vps/${vpsName}/stop`);
  }

  async rebootVPSInstance(vpsName: string) {
    return this.client.post(`${this.infrastructurePath}/vps/${vpsName}/reboot`);
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async getPortalUsers(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.portalPath}/users?${params.toString()}`);
  }

  async getPortalUser(userId: string) {
    return this.client.get(`${this.portalPath}/users/${userId}`);
  }

  async createUser(userData: any) {
    return this.client.post(`${this.portalPath}/users`, userData);
  }

  async updatePortalUser(userId: string, userData: any) {
    return this.client.put(`${this.portalPath}/users/${userId}`, userData);
  }

  async deletePortalUser(userId: string) {
    return this.client.delete(`${this.portalPath}/users/${userId}`);
  }

  async updateUserPermissions(userId: string, permissions: any) {
    return this.client.put(`${this.portalPath}/users/${userId}/permissions`, { permissions });
  }

  // ============================================================================
  // Roles & Permissions
  // ============================================================================

  async getRoles() {
    return this.client.get(`${this.portalPath}/roles`);
  }

  async getRole(roleId: string) {
    return this.client.get(`${this.portalPath}/roles/${roleId}`);
  }

  async createRole(roleData: any) {
    return this.client.post(`${this.portalPath}/roles`, roleData);
  }

  async updateRole(roleId: string, roleData: any) {
    return this.client.put(`${this.portalPath}/roles/${roleId}`, roleData);
  }

  async deleteRole(roleId: string) {
    return this.client.delete(`${this.portalPath}/roles/${roleId}`);
  }

  async getPermissions() {
    return this.client.get(`${this.portalPath}/permissions`);
  }

  // ============================================================================
  // Logs
  // ============================================================================

  async getLogs(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.logsPath}?${params.toString()}`);
  }

  async getSystemLogs(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.logsPath}/system?${params.toString()}`);
  }

  async searchLogs(query: string, filters: Record<string, any> = {}) {
    const params = new URLSearchParams({ ...filters, q: query });
    return this.client.get(`${this.logsPath}/search?${params.toString()}`);
  }
}
