import { APIClient } from '../core/client';

/**
 * Portal (Admin) API
 * Platform administration and management endpoints
 */
export class PortalAPI {
  constructor(private client: APIClient) {}

  // ============================================================================
  // Dashboard & Analytics
  // ============================================================================

  async getDashboardMetrics() {
    const response = await this.client.get('/admin/dashboard');
    return response.metrics;
  }

  async getUpcomingRenewals(_days: number = 60) {
    const response = await this.client.get('/admin/dashboard');
    return response.upcomingRenewals || [];
  }

  async getAnalytics(period: string = '30d') {
    return this.client.get(`/admin/analytics?period=${period}`);
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

    return this.client.get(`/admin/customers?${params.toString()}`);
  }

  async getCustomer(id: string) {
    return this.client.get(`/admin/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.client.post('/admin/customers', data);
  }

  async updateCustomer(id: string, data: any) {
    return this.client.put(`/admin/customers/${id}`, data);
  }

  async deleteCustomer(id: string) {
    return this.client.delete(`/admin/customers/${id}`);
  }

  async getCustomerUsage(id: string, days: number = 30) {
    return this.client.get(`/admin/customers/${id}/usage?days=${days}`);
  }

  async getCustomerActivity(id: string, limit: number = 10) {
    return this.client.get(`/admin/customers/${id}/activity?limit=${limit}`);
  }

  // ============================================================================
  // License Operations
  // ============================================================================

  async renewLicense(customerId: string, months: number = 12) {
    return this.client.post(`/admin/licenses/${customerId}/renew`, { months });
  }

  async suspendLicense(customerId: string) {
    return this.client.post(`/admin/licenses/${customerId}/suspend`);
  }

  async reactivateLicense(customerId: string) {
    return this.client.post(`/admin/licenses/${customerId}/reactivate`);
  }

  async downloadLicenseFile(customerId: string) {
    const response = await this.client.get(`/admin/licenses/${customerId}/download`);
    
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
    return this.client.get('/tiers');
  }

  async getTierHistory(tierName: string) {
    return this.client.get(`/tiers/${tierName}/history`);
  }

  async getTierStats() {
    return this.client.get('/tiers/stats');
  }

  async createTierVersion(tierData: any, autoMigrate: boolean = false) {
    return this.client.post('/tiers/create-version', {
      ...tierData,
      autoMigrate,
    });
  }

  async previewTierMigration(tierName: string, filters: Record<string, any> = {}) {
    return this.client.post(`/tiers/${tierName}/preview-migration`, filters);
  }

  async executeTierMigration(migrationId: string, filters: Record<string, any> = {}) {
    return this.client.post(`/tiers/migrations/${migrationId}/execute`, filters);
  }

  async getMigrationHistory(tierName: string | null = null) {
    const params = tierName ? { tierName } : {};
    return this.client.get('/tiers/migrations/history', { params });
  }

  // ============================================================================
  // Security Monitoring
  // ============================================================================

  async getSecurityDashboard() {
    return this.client.get('/security/dashboard');
  }

  async getSecurityEvents(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`/security/events?${params.toString()}`);
  }

  async getSecurityAlerts(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`/security/alerts?${params.toString()}`);
  }

  async acknowledgeAlert(alertId: string) {
    return this.client.post(`/security/alerts/${alertId}/acknowledge`);
  }

  async resolveAlert(alertId: string) {
    return this.client.post(`/security/alerts/${alertId}/resolve`);
  }

  // ============================================================================
  // Deployment Management
  // ============================================================================

  async deployInstance(deploymentData: any) {
    return this.client.post('/deployments', deploymentData);
  }

  async getDeploymentStatus(jobId: string) {
    return this.client.get(`/deployments/${jobId}`);
  }

  async cancelDeployment(jobId: string) {
    return this.client.delete(`/deployments/${jobId}`);
  }

  async getDeploymentStats() {
    return this.client.get('/deployments/stats');
  }

  // ============================================================================
  // Infrastructure/VPS Management
  // ============================================================================

  async getVPSInstances() {
    return this.client.get('/infrastructure/vps');
  }

  async getVPSInstance(vpsName: string) {
    return this.client.get(`/infrastructure/vps/${vpsName}`);
  }

  async createVPSInstance(data: any) {
    return this.client.post('/infrastructure/vps', data);
  }

  async deleteVPSInstance(vpsName: string) {
    return this.client.delete(`/infrastructure/vps/${vpsName}`);
  }

  async startVPSInstance(vpsName: string) {
    return this.client.post(`/infrastructure/vps/${vpsName}/start`);
  }

  async stopVPSInstance(vpsName: string) {
    return this.client.post(`/infrastructure/vps/${vpsName}/stop`);
  }

  async rebootVPSInstance(vpsName: string) {
    return this.client.post(`/infrastructure/vps/${vpsName}/reboot`);
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async getPortalUsers(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`/portal/users?${params.toString()}`);
  }

  async getPortalUser(userId: string) {
    return this.client.get(`/portal/users/${userId}`);
  }

  async createPortalUser(userData: any) {
    return this.client.post('/portal/users', userData);
  }

  async updatePortalUser(userId: string, userData: any) {
    return this.client.put(`/portal/users/${userId}`, userData);
  }

  async deletePortalUser(userId: string) {
    return this.client.delete(`/portal/users/${userId}`);
  }

  async updateUserPermissions(userId: string, permissions: any) {
    return this.client.put(`/portal/users/${userId}/permissions`, { permissions });
  }

  // ============================================================================
  // Roles & Permissions
  // ============================================================================

  async getRoles() {
    return this.client.get('/portal/roles');
  }

  async getRole(roleId: string) {
    return this.client.get(`/portal/roles/${roleId}`);
  }

  async createRole(roleData: any) {
    return this.client.post('/portal/roles', roleData);
  }

  async updateRole(roleId: string, roleData: any) {
    return this.client.put(`/portal/roles/${roleId}`, roleData);
  }

  async deleteRole(roleId: string) {
    return this.client.delete(`/portal/roles/${roleId}`);
  }

  async getPermissions() {
    return this.client.get('/portal/permissions');
  }

  // ============================================================================
  // Logs
  // ============================================================================

  async getLogs(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`/logs?${params.toString()}`);
  }

  async getSystemLogs(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`/logs/system?${params.toString()}`);
  }

  async searchLogs(query: string, filters: Record<string, any> = {}) {
    const params = new URLSearchParams({ ...filters, q: query });
    return this.client.get(`/logs/search?${params.toString()}`);
  }
}
