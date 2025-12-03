/**
 * Portal Service Layer
 * Wraps @recruitiq/api-client PortalAPI with Portal-specific business logic
 * 
 * @see FRONTEND_STANDARDS.md - "API Client Integration Standards"
 */

import { PortalAPI, APIClient, FeaturesAPI } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const portalAPI = new PortalAPI(apiClient);
const featuresAPI = new FeaturesAPI(apiClient);

/**
 * Helper to calculate Monthly Recurring Revenue (MRR) based on tier
 */
function calculateMRR(tier: string): number {
  const prices: Record<string, number> = {
    starter: 99,
    professional: 299,
    enterprise: 999,
  };
  return prices[tier] || 0;
}

/**
 * Helper to format activity messages
 */
function formatActivityMessage(activity: any): string {
  const typeMessages: Record<string, string> = {
    'heartbeat': 'Instance heartbeat received',
    'job_created': 'New job created',
    'candidate_added': 'New candidate added',
    'user_login': 'User logged in',
    'license_validated': 'License validated',
  };
  return typeMessages[activity.event_type] || activity.event_type;
}

/**
 * Transform backend customer data to frontend format
 */
function transformCustomer(customer: any) {
  return {
    id: customer.id,
    name: customer.name,
    contactEmail: customer.contact_email,
    contactName: customer.contact_name,
    tier: customer.tier,
    deploymentType: customer.deployment_type,
    status: customer.status,
    instanceKey: customer.instance_key,
    instanceUrl: customer.instance_url,
    contractStartDate: customer.contract_start_date,
    contractEndDate: customer.contract_end_date || customer.license_expires_at,
    lastHeartbeat: customer.last_heartbeat,
    users: {
      current: 0,
      limit: customer.max_users,
    },
    workspaces: {
      current: 0,
      limit: customer.max_workspaces,
    },
    jobs: {
      current: 0,
      limit: customer.max_jobs,
    },
    candidates: {
      current: 0,
      limit: customer.max_candidates,
    },
    mrr: calculateMRR(customer.tier),
    version: customer.app_version || 'N/A',
    license_id: customer.license_id,
  };
}

/**
 * Transform backend customer detail data with usage stats
 */
function transformCustomerDetail(data: any) {
  const customer = transformCustomer(data.customer);

  // Add usage stats
  if (data.usageStats) {
    customer.users.current = parseInt(data.usageStats.max_users) || 0;
    customer.workspaces.current = parseInt(data.usageStats.max_workspaces) || 0;
    customer.jobs.current = parseInt(data.usageStats.max_jobs) || 0;
    customer.candidates.current = parseInt(data.usageStats.max_candidates) || 0;
  }

  return customer;
}

/**
 * Transform frontend customer data to backend format
 */
function transformCustomerForBackend(data: any) {
  return {
    name: data.name,
    contactEmail: data.contactEmail,
    contactName: data.contactName,
    deploymentType: data.deploymentType,
    tier: data.tier,
    maxUsers: data.maxUsers,
    maxWorkspaces: data.maxWorkspaces,
    maxJobs: data.maxJobs,
    maxCandidates: data.maxCandidates,
    features: data.features || [],
    instanceUrl: data.instanceUrl,
    contractMonths: data.contractMonths || 12,
    sessionPolicy: data.sessionPolicy || 'multiple',
    maxSessionsPerUser: data.maxSessionsPerUser || 5,
    concurrentLoginDetection:
      data.concurrentLoginDetection !== undefined
        ? data.concurrentLoginDetection
        : true,
    mfaRequired:
      data.mfaRequired !== undefined
        ? data.mfaRequired
        : data.deploymentType === 'cloud-shared',
  };
}

/**
 * Portal Service
 * Industry-standard service layer using centralized API client
 */
export const portalService = {
  // ============================================================================
  // Authentication
  // ============================================================================

  async login(email: string, password: string) {
    const response = await portalAPI.login(email, password);
    return response;
  },

  async logout() {
    await portalAPI.logout();
  },

  async getMe() {
    return portalAPI.getMe();
  },

  // ============================================================================
  // Multi-Factor Authentication (MFA)
  // ============================================================================

  async getMFAStatus() {
    return portalAPI.getMFAStatus();
  },

  async setupMFA() {
    return portalAPI.setupMFA();
  },

  async verifyMFASetup(token: string, secret: string) {
    return portalAPI.verifyMFASetup(token, secret);
  },

  async verifyMFA(mfaToken: string, token: string) {
    return portalAPI.verifyMFA(mfaToken, token);
  },

  async useBackupCode(mfaToken: string, backupCode: string) {
    return portalAPI.useBackupCode(mfaToken, backupCode);
  },

  async disableMFA(password: string, token: string) {
    return portalAPI.disableMFA(password, token);
  },

  async regenerateBackupCodes(password: string, token: string) {
    return portalAPI.regenerateBackupCodes(password, token);
  },

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboardMetrics() {
    return portalAPI.getDashboardMetrics();
  },

  async getUpcomingRenewals(days: number = 60) {
    const response = await portalAPI.getUpcomingRenewals(days);
    const renewals = response || [];

    // Transform to match frontend format
    return renewals.map((r: any) => ({
      id: r.id,
      name: r.name,
      instanceKey: r.instance_key,
      tier: r.tier,
      contractEndDate: r.expires_at,
      status: 'active',
      mrr: calculateMRR(r.tier),
    }));
  },

  async getAnalytics(period: string = '30d') {
    return portalAPI.getAnalytics(period);
  },

  // ============================================================================
  // Customers
  // ============================================================================

  async getCustomers(filters: Record<string, any> = {}) {
    const response = await portalAPI.getCustomers(filters);
    return response.customers.map((c: any) => transformCustomer(c));
  },

  async getCustomer(id: string) {
    const response = await portalAPI.getCustomer(id);
    return transformCustomerDetail(response);
  },

  async createCustomer(data: any) {
    const backendData = transformCustomerForBackend(data);
    const response = await portalAPI.createCustomer(backendData);
    return transformCustomer(response.customer);
  },

  async updateCustomer(id: string, data: any) {
    const response = await portalAPI.updateCustomer(id, data);
    return transformCustomer(response.customer);
  },

  async deleteCustomer(id: string) {
    return portalAPI.deleteCustomer(id);
  },

  async getCustomerUsage(id: string, days: number = 30) {
    const response = await portalAPI.getCustomerUsage(id, days);
    // Transform backend format to frontend format
    return (response.trends || []).map((t: any) => ({
      date: t.date,
      logins: 0, // Not tracked yet
      jobsCreated: t.max_jobs || 0,
      candidatesAdded: t.max_candidates || 0,
      interviewsScheduled: 0, // Not tracked yet
    }));
  },

  async getCustomerActivity(id: string) {
    const response = await portalAPI.getCustomer(id);
    // Transform activity events
    return (response.activity || []).map((a: any) => ({
      type: a.event_type,
      message: formatActivityMessage(a),
      timestamp: a.timestamp,
    }));
  },

  // ============================================================================
  // Licenses
  // ============================================================================

  async renewLicense(customerId: string, months: number = 12) {
    const customer = await this.getCustomer(customerId);
    return portalAPI.renewLicense(customer.license_id, months);
  },

  async suspendLicense(customerId: string) {
    const customer = await this.getCustomer(customerId);
    return portalAPI.suspendLicense(customer.license_id);
  },

  async reactivateLicense(customerId: string) {
    const customer = await this.getCustomer(customerId);
    return portalAPI.reactivateLicense(customer.license_id);
  },

  async downloadLicenseFile(customerId: string) {
    const customer = await this.getCustomer(customerId);
    return portalAPI.downloadLicenseFile(customer.license_id);
  },

  // ============================================================================
  // Security Monitoring
  // ============================================================================

  async getSecurityDashboard() {
    return portalAPI.getSecurityDashboard();
  },

  async getSecurityEvents(filters: Record<string, any> = {}) {
    return portalAPI.getSecurityEvents(filters);
  },

  async getSecurityAlerts(filters: Record<string, any> = {}) {
    return portalAPI.getSecurityAlerts(filters);
  },

  async acknowledgeAlert(alertId: string) {
    return portalAPI.acknowledgeAlert(alertId);
  },

  async resolveAlert(alertId: string) {
    return portalAPI.resolveAlert(alertId);
  },

  // ============================================================================
  // Deployment Management
  // ============================================================================

  async deployInstance(deploymentData: any) {
    return portalAPI.deployInstance(deploymentData);
  },

  async getDeploymentStatus(jobId: string) {
    return portalAPI.getDeploymentStatus(jobId);
  },

  async cancelDeployment(jobId: string) {
    return portalAPI.cancelDeployment(jobId);
  },

  async getDeploymentStats() {
    return portalAPI.getDeploymentStats();
  },

  // ============================================================================
  // Infrastructure/VPS Management
  // ============================================================================

  async getVPSInstances() {
    return portalAPI.getVPSInstances();
  },

  async getVPSInstance(vpsName: string) {
    return portalAPI.getVPSInstance(vpsName);
  },

  async createVPSInstance(data: any) {
    return portalAPI.createVPSInstance(data);
  },

  async deleteVPSInstance(vpsName: string) {
    return portalAPI.deleteVPSInstance(vpsName);
  },

  async startVPSInstance(vpsName: string) {
    return portalAPI.startVPSInstance(vpsName);
  },

  async stopVPSInstance(vpsName: string) {
    return portalAPI.stopVPSInstance(vpsName);
  },

  async rebootVPSInstance(vpsName: string) {
    return portalAPI.rebootVPSInstance(vpsName);
  },

  // ============================================================================
  // Tier Management
  // ============================================================================

  async getTiers() {
    return portalAPI.getTiers();
  },

  async getTierHistory(tierName: string) {
    return portalAPI.getTierHistory(tierName);
  },

  async getTierStats() {
    return portalAPI.getTierStats();
  },

  async createTierVersion(tierData: any, autoMigrate: boolean = false) {
    return portalAPI.createTierVersion(tierData, autoMigrate);
  },

  async previewTierMigration(tierName: string, filters: Record<string, any> = {}) {
    return portalAPI.previewTierMigration(tierName, filters);
  },

  async executeTierMigration(migrationId: string, filters: Record<string, any> = {}) {
    return portalAPI.executeTierMigration(migrationId, filters);
  },

  async getMigrationHistory(tierName: string | null = null) {
    return portalAPI.getMigrationHistory(tierName);
  },

  // ============================================================================
  // User Management
  // ============================================================================

  async getPortalUsers(filters: Record<string, any> = {}) {
    return portalAPI.getPortalUsers(filters);
  },

  async getPortalUser(userId: string) {
    return portalAPI.getPortalUser(userId);
  },

  async createUser(userData: any) {
    return portalAPI.createUser(userData);
  },

  async updatePortalUser(userId: string, userData: any) {
    return portalAPI.updatePortalUser(userId, userData);
  },

  async deletePortalUser(userId: string) {
    return portalAPI.deletePortalUser(userId);
  },

  async updateUserPermissions(userId: string, permissions: any) {
    return portalAPI.updateUserPermissions(userId, permissions);
  },

  // ============================================================================
  // Roles & Permissions
  // ============================================================================

  async getRoles() {
    return portalAPI.getRoles();
  },

  async getRole(roleId: string) {
    return portalAPI.getRole(roleId);
  },

  async createRole(roleData: any) {
    return portalAPI.createRole(roleData);
  },

  async updateRole(roleId: string, roleData: any) {
    return portalAPI.updateRole(roleId, roleData);
  },

  async deleteRole(roleId: string) {
    return portalAPI.deleteRole(roleId);
  },

  async getPermissions() {
    return portalAPI.getPermissions();
  },

  // ============================================================================
  // Logs
  // ============================================================================

  async getLogs(filters: Record<string, any> = {}) {
    return portalAPI.getLogs(filters);
  },

  async getSystemLogs(filters: Record<string, any> = {}) {
    return portalAPI.getSystemLogs(filters);
  },

  async searchLogs(query: string, filters: Record<string, any> = {}) {
    return portalAPI.searchLogs(query, filters);
  },

  // ============================================================================
  // Features Management (Admin)
  // ============================================================================

  async getFeatures(filters: Record<string, any> = {}) {
    const response = await featuresAPI.listFeatures(filters);
    return { features: response.features || [], total: response.total };
  },

  async getFeature(id: string) {
    return featuresAPI.getFeature(id);
  },

  async createFeature(data: any) {
    return featuresAPI.createFeature(data);
  },

  async updateFeature(id: string, data: any) {
    return featuresAPI.updateFeature(id, data);
  },

  async deprecateFeature(id: string, message?: string) {
    return featuresAPI.deprecateFeature(id, message);
  },

  async updateFeatureRollout(id: string, percentage: number, targetOrganizations?: string[]) {
    return featuresAPI.updateRollout(id, percentage, targetOrganizations);
  },

  async getFeatureAnalytics(featureId: string) {
    return featuresAPI.getFeatureAnalytics(featureId);
  },

  async getFeatureAdoptionReport(productId?: string) {
    return featuresAPI.getAdoptionReport(productId);
  },

  // ============================================================================
  // Feature Grants (Admin)
  // ============================================================================

  async getOrganizationFeatures(organizationId: string, params?: Record<string, any>) {
    return featuresAPI.getOrganizationGrants(organizationId, params);
  },

  async grantFeature(organizationId: string, data: any) {
    return featuresAPI.grantFeature(organizationId, data);
  },

  async revokeFeatureGrant(organizationId: string, grantId: string, reason?: string) {
    return featuresAPI.revokeGrant(organizationId, grantId, reason);
  },

  async syncTierFeatures(organizationId: string, productId: string, tier: string) {
    return featuresAPI.syncTierFeatures(organizationId, productId, tier);
  },

  async previewTierChange(organizationId: string, productId: string, newTier: string) {
    return featuresAPI.previewTierChange(organizationId, productId, newTier);
  },

  // ============================================================================
  // Products Management (Admin)
  // ============================================================================

  async getProducts(filters: Record<string, any> = {}) {
    const response = await portalAPI.getProducts(filters);
    return { products: response.products || [], total: response.total };
  },

  async getProduct(id: string) {
    return portalAPI.getProduct(id);
  },

  async createProduct(data: any) {
    return portalAPI.createProduct(data);
  },

  async updateProduct(id: string, data: any) {
    return portalAPI.updateProduct(id, data);
  },

  async deleteProduct(id: string) {
    return portalAPI.deleteProduct(id);
  },

  // ============================================================================
  // Organizations Management (Admin)
  // ============================================================================

  async getOrganizations(filters: Record<string, any> = {}) {
    const response = await portalAPI.getOrganizations(filters);
    return { organizations: response.organizations || [], total: response.total };
  },

  async getOrganization(id: string) {
    return portalAPI.getOrganization(id);
  },

  async createOrganization(data: any) {
    return portalAPI.createOrganization(data);
  },

  async updateOrganization(id: string, data: any) {
    return portalAPI.updateOrganization(id, data);
  },

  async deleteOrganization(id: string) {
    return portalAPI.deleteOrganization(id);
  },

  async getOrganizationStats(id: string) {
    return portalAPI.getOrganizationStats(id);
  },
};

export default portalService;
