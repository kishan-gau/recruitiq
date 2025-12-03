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
  // Authentication (Platform Admin)
  // ============================================================================

  async login(email: string, password: string) {
    return this.client.post('auth/platform/login', { email, password });
  }

  async logout() {
    return this.client.post('auth/platform/logout', {});
  }

  async getMe() {
    const response = await this.client.get('auth/platform/me');
    return response.data?.user || response.user || response;
  }

  // ============================================================================
  // Multi-Factor Authentication (MFA)
  // ============================================================================

  async getMFAStatus() {
    const response = await this.client.get('auth/mfa/status');
    return response.data || response;
  }

  async setupMFA() {
    return this.client.post('auth/mfa/setup', {});
  }

  async verifyMFASetup(token: string, secret: string) {
    return this.client.post('auth/mfa/verify-setup', { token, secret });
  }

  async verifyMFA(mfaToken: string, token: string) {
    return this.client.post('auth/mfa/verify', { mfaToken, token });
  }

  async useBackupCode(mfaToken: string, backupCode: string) {
    return this.client.post('auth/mfa/use-backup-code', { mfaToken, backupCode });
  }

  async disableMFA(password: string, token: string) {
    return this.client.post('auth/mfa/disable', { password, token });
  }

  async regenerateBackupCodes(password: string, token: string) {
    return this.client.post('auth/mfa/regenerate-backup-codes', { password, token });
  }

  // ============================================================================
  // Dashboard & Analytics
  // ============================================================================

  async getDashboardMetrics() {
    const response = await this.client.get(`${this.adminPath}/dashboard`);
    return response.metrics || response.data?.metrics || response;
  }

  async getUpcomingRenewals(_days: number = 60) {
    const response = await this.client.get(`${this.adminPath}/dashboard`);
    return response.upcomingRenewals || response.data?.upcomingRenewals || [];
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

  // ============================================================================
  // Products Management (Admin)
  // ============================================================================

  async getProducts(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.adminPath}/products?${params.toString()}`);
  }

  async getProduct(id: string) {
    return this.client.get(`${this.adminPath}/products/${id}`);
  }

  async createProduct(data: any) {
    return this.client.post(`${this.adminPath}/products`, data);
  }

  async updateProduct(id: string, data: any) {
    return this.client.patch(`${this.adminPath}/products/${id}`, data);
  }

  async deleteProduct(id: string) {
    return this.client.delete(`${this.adminPath}/products/${id}`);
  }

  // ============================================================================
  // Organizations Management (Admin)
  // ============================================================================

  async getOrganizations(filters: Record<string, any> = {}) {
    const params = new URLSearchParams(filters);
    return this.client.get(`${this.adminPath}/organizations?${params.toString()}`);
  }

  async getOrganization(id: string) {
    return this.client.get(`${this.adminPath}/organizations/${id}`);
  }

  async createOrganization(data: any) {
    return this.client.post(`${this.adminPath}/organizations`, data);
  }

  async updateOrganization(id: string, data: any) {
    return this.client.patch(`${this.adminPath}/organizations/${id}`, data);
  }

  async deleteOrganization(id: string) {
    return this.client.delete(`${this.adminPath}/organizations/${id}`);
  }

  async getOrganizationStats(id: string) {
    return this.client.get(`${this.adminPath}/organizations/${id}/stats`);
  }

  // ============================================================================
  // Platform RBAC Management (Portal Admin Only)
  // ============================================================================

  async getPlatformPermissions() {
    return this.client.get('platform/rbac/permissions');
  }

  async getPlatformRoles() {
    return this.client.get('platform/rbac/roles');
  }

  async getPlatformRole(roleId: string) {
    return this.client.get(`platform/rbac/roles/${roleId}`);
  }

  async createPlatformRole(data: {
    name: string;
    display_name?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    return this.client.post('platform/rbac/roles', data);
  }

  async updatePlatformRole(
    roleId: string,
    data: {
      display_name?: string;
      description?: string;
      permissionIds?: string[];
    }
  ) {
    return this.client.patch(`platform/rbac/roles/${roleId}`, data);
  }

  async deletePlatformRole(roleId: string) {
    return this.client.delete(`platform/rbac/roles/${roleId}`);
  }

  async getPlatformUsers() {
    return this.client.get('platform/rbac/users');
  }

  async getPlatformUserRoles(userId: string) {
    return this.client.get(`platform/rbac/users/${userId}/roles`);
  }

  async assignPlatformRole(userId: string, roleId: string) {
    return this.client.post(`platform/rbac/users/${userId}/roles`, { roleId });
  }

  async revokePlatformRole(userId: string, roleId: string) {
    return this.client.delete(`platform/rbac/users/${userId}/roles/${roleId}`);
  }
}
