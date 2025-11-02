/**
 * Unified API Service for RecruitIQ Platform
 * Centralized API client with authentication, error handling, and request management
 */
import axios from 'axios'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies for authentication
})

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Don't retry for login, refresh, or logout endpoints
    const skipRefreshUrls = ['/auth/login', '/auth/refresh', '/auth/logout'];
    const shouldSkipRefresh = skipRefreshUrls.some(url => originalRequest.url?.includes(url));

    // If 401 and not already retrying, try to refresh token via cookies
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;

      try {
        // Refresh token is sent automatically via cookies
        await api.post('/auth/refresh', {});
        
        // Retry original request (new token is now in cookies)
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login only if not already on login page
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
)

/**
 * Unified API Service Class
 * Contains all API methods for the Platform application
 */
class APIService {
  // ============================================================================
  // Authentication API Methods
  // ============================================================================

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { user } = response.data
    
    // Store user data in localStorage for convenience (non-sensitive)
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    }
    return response.data
  }

  async logout() {
    try {
      await api.post('/auth/logout', {})
    } catch (err) {
      console.error('Logout error:', err)
    }
    localStorage.removeItem('user')
  }

  async getMe() {
    const response = await api.get('/auth/me')
    return response.data.user
  }

  // ============================================================================
  // Multi-Factor Authentication (MFA) API Methods
  // ============================================================================

  /**
   * Get MFA status for current user
   * @returns {Promise<Object>} MFA status including enabled, required, grace period info
   */
  async getMFAStatus() {
    const response = await api.get('/auth/mfa/status')
    return response.data.data
  }

  /**
   * Initiate MFA setup - generates QR code and secret
   * @returns {Promise<Object>} QR code URL and manual entry key
   */
  async setupMFA() {
    const response = await api.post('/auth/mfa/setup')
    return response.data
  }

  /**
   * Verify MFA setup with TOTP token and enable MFA
   * @param {string} token - 6-digit TOTP code from authenticator app
   * @param {string} secret - Temporary secret from setup
   * @returns {Promise<Object>} Success message and backup codes
   */
  async verifyMFASetup(token, secret) {
    const response = await api.post('/auth/mfa/verify-setup', { token, secret })
    return response.data
  }

  /**
   * Verify MFA during login (after initial credentials)
   * @param {string} mfaToken - Temporary MFA token from login response
   * @param {string} token - 6-digit TOTP code from authenticator app
   * @returns {Promise<Object>} User data and auth tokens
   */
  async verifyMFA(mfaToken, token) {
    const response = await api.post('/auth/mfa/verify', { mfaToken, token })
    return response.data
  }

  /**
   * Use backup code during login (alternative to TOTP)
   * @param {string} mfaToken - Temporary MFA token from login response
   * @param {string} backupCode - One-time backup code
   * @returns {Promise<Object>} User data and auth tokens
   */
  async useBackupCode(mfaToken, backupCode) {
    const response = await api.post('/auth/mfa/use-backup-code', { mfaToken, backupCode })
    return response.data
  }

  /**
   * Disable MFA for current user
   * @param {string} password - User's current password
   * @param {string} token - Current TOTP code or backup code
   * @returns {Promise<Object>} Success message
   */
  async disableMFA(password, token) {
    const response = await api.post('/auth/mfa/disable', { password, token })
    return response.data
  }

  /**
   * Regenerate backup codes (invalidates old ones)
   * @param {string} password - User's current password
   * @param {string} token - Current TOTP code
   * @returns {Promise<Object>} New backup codes
   */
  async regenerateBackupCodes(password, token) {
    const response = await api.post('/auth/mfa/regenerate-backup-codes', { password, token })
    return response.data
  }

  // ============================================================================
  // Security Monitoring API Methods
  // ============================================================================

  async getSecurityDashboard() {
    const response = await api.get('/security/dashboard')
    return response.data
  }

  async getSecurityEvents(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/security/events?${params.toString()}`)
    return response.data
  }

  async getSecurityAlerts(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/security/alerts?${params.toString()}`)
    return response.data
  }

  async acknowledgeAlert(alertId) {
    const response = await api.post(`/security/alerts/${alertId}/acknowledge`)
    return response.data
  }

  async resolveAlert(alertId) {
    const response = await api.post(`/security/alerts/${alertId}/resolve`)
    return response.data
  }

  // ============================================================================
  // License Management API Methods
  // ============================================================================
  // Dashboard
  async getDashboardMetrics() {
    const response = await api.get('/admin/dashboard')
    return response.data.metrics
  }

  async getUpcomingRenewals(days = 60) {
    const response = await api.get('/admin/dashboard')
    const renewals = response.data.upcomingRenewals || []
    // Transform to match frontend format
    return renewals.map(r => ({
      id: r.id,
      name: r.name,
      instanceKey: r.instance_key,
      tier: r.tier,
      contractEndDate: r.expires_at,
      status: 'active',
      mrr: this.calculateMRR(r.tier)
    }))
  }

  // Customers
  async getCustomers(filters = {}) {
    const params = new URLSearchParams()
    if (filters.tier && filters.tier !== 'all') params.append('tier', filters.tier)
    if (filters.status && filters.status !== 'all') params.append('status', filters.status)
    if (filters.deploymentType && filters.deploymentType !== 'all') params.append('deploymentType', filters.deploymentType)
    if (filters.search) params.append('search', filters.search)
    
    const response = await api.get(`/admin/customers?${params.toString()}`)
    return response.data.customers.map(c => this.transformCustomer(c))
  }

  async getCustomer(id) {
    const response = await api.get(`/admin/customers/${id}`)
    return this.transformCustomerDetail(response.data)
  }

  async createCustomer(data) {
    const response = await api.post('/admin/customers', this.transformCustomerForBackend(data))
    return this.transformCustomer(response.data.customer)
  }

  async updateCustomer(id, data) {
    const response = await api.put(`/admin/customers/${id}`, data)
    return this.transformCustomer(response.data.customer)
  }

  async deleteCustomer(id) {
    const response = await api.delete(`/admin/customers/${id}`)
    return response.data
  }

  // Customer usage
  async getCustomerUsage(id, days = 30) {
    const response = await api.get(`/admin/customers/${id}/usage?days=${days}`)
    // Transform backend format to frontend format
    return (response.data.trends || []).map(t => ({
      date: t.date,
      logins: 0, // Not tracked yet
      jobsCreated: t.max_jobs || 0,
      candidatesAdded: t.max_candidates || 0,
      interviewsScheduled: 0 // Not tracked yet
    }))
  }

  async getCustomerActivity(id, limit = 10) {
    const response = await api.get(`/admin/customers/${id}`)
    // Transform activity events
    return (response.data.activity || []).map(a => ({
      type: a.event_type,
      message: this.formatActivityMessage(a),
      timestamp: a.timestamp
    }))
  }

  formatActivityMessage(activity) {
    const typeMessages = {
      'heartbeat': 'Instance heartbeat received',
      'job_created': 'New job created',
      'candidate_added': 'New candidate added',
      'user_login': 'User logged in',
      'license_validated': 'License validated'
    }
    return typeMessages[activity.event_type] || activity.event_type
  }

  // Licenses
  async renewLicense(customerId, months = 12) {
    // Get customer's license ID first
    const customer = await this.getCustomer(customerId)
    const response = await api.post(`/admin/licenses/${customer.license_id}/renew`, { months })
    return response.data
  }

  async suspendLicense(customerId) {
    const customer = await this.getCustomer(customerId)
    const response = await api.post(`/admin/licenses/${customer.license_id}/suspend`)
    return response.data
  }

  async reactivateLicense(customerId) {
    const customer = await this.getCustomer(customerId)
    const response = await api.post(`/admin/licenses/${customer.license_id}/reactivate`)
    return response.data
  }

  async downloadLicenseFile(customerId) {
    const customer = await this.getCustomer(customerId)
    const response = await api.get(`/admin/licenses/${customer.license_id}/download`)
    
    // Create download
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recruitiq-${customer.instanceKey}.lic`
    a.click()
    window.URL.revokeObjectURL(url)
    
    return response.data
  }

  // Analytics
  async getAnalytics(period = '30d') {
    // For now, return empty data
    // TODO: Implement dedicated analytics endpoint
    return {
      revenue: [],
      usage: []
    }
  }

  // Transform backend data to frontend format
  transformCustomer(customer) {
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
        limit: customer.max_users
      },
      workspaces: {
        current: 0,
        limit: customer.max_workspaces
      },
      jobs: {
        current: 0,
        limit: customer.max_jobs
      },
      candidates: {
        current: 0,
        limit: customer.max_candidates
      },
      mrr: this.calculateMRR(customer.tier),
      version: customer.app_version || 'N/A',
      license_id: customer.license_id
    }
  }

  transformCustomerDetail(data) {
    const customer = this.transformCustomer(data.customer)
    
    // Add usage stats
    if (data.usageStats) {
      customer.users.current = parseInt(data.usageStats.max_users) || 0
      customer.workspaces.current = parseInt(data.usageStats.max_workspaces) || 0
      customer.jobs.current = parseInt(data.usageStats.max_jobs) || 0
      customer.candidates.current = parseInt(data.usageStats.max_candidates) || 0
    }
    
    return customer
  }

  transformCustomerForBackend(data) {
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
      concurrentLoginDetection: data.concurrentLoginDetection !== undefined ? data.concurrentLoginDetection : true,
      mfaRequired: data.mfaRequired !== undefined ? data.mfaRequired : (data.deploymentType === 'cloud-shared')
    }
  }

  calculateMRR(tier) {
    const prices = {
      starter: 99,
      professional: 299,
      enterprise: 999
    }
    return prices[tier] || 0
  }

  // ============================================================================
  // Deployment API Methods (TransIP OpenStack Integration)
  // ============================================================================

  /**
   * Deploy a new RecruitIQ instance
   * @param {object} deploymentData - Deployment configuration
   * @returns {Promise} Deployment job information
   */
  async deployInstance(deploymentData) {
    const response = await api.post('/api/deployments', deploymentData)
    return response.data
  }

  /**
   * Get deployment status
   * @param {string} jobId - Deployment job ID
   * @returns {Promise} Deployment status
   */
  async getDeploymentStatus(jobId) {
    const response = await api.get(`/api/deployments/${jobId}`)
    return response.data
  }

  /**
   * Cancel a deployment
   * @param {string} jobId - Deployment job ID
   * @returns {Promise} Cancellation result
   */
  async cancelDeployment(jobId) {
    const response = await api.delete(`/api/deployments/${jobId}`)
    return response.data
  }

  /**
   * Get deployment queue statistics
   * @returns {Promise} Queue statistics
   */
  async getDeploymentStats() {
    const response = await api.get('/api/deployments/stats')
    return response.data
  }

  /**
   * Get instance details
   * @param {string} vpsName - VPS name
   * @returns {Promise} Instance details
   */
  async getInstanceDetails(vpsName) {
    const response = await api.get(`/api/instances/${vpsName}`)
    return response.data
  }

  /**
   * Start an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async startInstance(vpsName) {
    const response = await api.post(`/api/instances/${vpsName}/start`, {})
    return response.data
  }

  /**
   * Stop an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async stopInstance(vpsName) {
    const response = await api.post(`/api/instances/${vpsName}/stop`, {})
    return response.data
  }

  /**
   * Reboot an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async rebootInstance(vpsName) {
    const response = await api.post(`/api/instances/${vpsName}/reboot`, {})
    return response.data
  }

  /**
   * Delete an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async deleteInstance(vpsName) {
    const response = await api.delete(`/api/instances/${vpsName}`)
    return response.data
  }

  /**
   * Create a snapshot of an instance
   * @param {string} vpsName - VPS name
   * @param {string} description - Snapshot description
   * @returns {Promise} Snapshot details
   */
  async createSnapshot(vpsName, description) {
    const response = await api.post(`/api/instances/${vpsName}/snapshots`, { description })
    return response.data
  }

  // ============================================================================
  // Tier Management
  // ============================================================================

  /**
   * Get all active tier presets
   * @returns {Promise} Tier presets
   */
  async getTiers() {
    const response = await api.get('/tiers')
    return response.data
  }

  /**
   * Get tier version history
   * @param {string} tierName - Tier name (starter, professional, enterprise)
   * @returns {Promise} Tier history
   */
  async getTierHistory(tierName) {
    const response = await api.get(`/tiers/${tierName}/history`)
    return response.data
  }

  /**
   * Get tier usage statistics
   * @returns {Promise} Usage stats
   */
  async getTierStats() {
    const response = await api.get('/tiers/stats')
    return response.data
  }

  /**
   * Create a new tier version
   * @param {Object} tierData - New tier configuration
   * @param {boolean} autoMigrate - Whether to auto-migrate customers
   * @returns {Promise} Created preset
   */
  async createTierVersion(tierData, autoMigrate = false) {
    const response = await api.post('/tiers/create-version', {
      ...tierData,
      autoMigrate
    })
    return response.data
  }

  /**
   * Preview migration impact
   * @param {string} tierName - Tier name
   * @param {Object} filters - Migration filters (status, deploymentType, autoUpgrade)
   * @returns {Promise} Preview data
   */
  async previewTierMigration(tierName, filters = {}) {
    const response = await api.post(`/tiers/${tierName}/preview-migration`, filters)
    return response.data
  }

  /**
   * Execute tier migration
   * @param {string} migrationId - Migration ID
   * @param {Object} filters - Migration filters
   * @returns {Promise} Migration result
   */
  async executeTierMigration(migrationId, filters = {}) {
    const response = await api.post(`/tiers/migrations/${migrationId}/execute`, filters)
    return response.data
  }

  /**
   * Get migration history
   * @param {string} tierName - Optional tier filter
   * @returns {Promise} Migration history
   */
  async getMigrationHistory(tierName = null) {
    const params = tierName ? { tierName } : {}
    const response = await api.get('/tiers/migrations/history', { params })
    return response.data
  }

  /**
   * Compare two tier versions
   * @param {string} presetId1 - First preset ID
   * @param {string} presetId2 - Second preset ID
   * @returns {Promise} Comparison data
   */
  async compareTierVersions(presetId1, presetId2) {
    const response = await api.get('/tiers/compare', {
      params: { presetId1, presetId2 }
    })
    return response.data
  }

  /**
   * Get customers using a specific tier preset
   * @param {string} presetId - Preset ID
   * @returns {Promise} Customer list
   */
  async getTierPresetCustomers(presetId) {
    const response = await api.get(`/tiers/preset/${presetId}/customers`)
    return response.data
  }

  // ============================================================================
  // Infrastructure/VPS Management API Methods  
  // ============================================================================

  async getVPSInstances() {
    const response = await api.get('/infrastructure/vps')
    return response.data
  }

  async getVPSInstance(vpsName) {
    const response = await api.get(`/infrastructure/vps/${vpsName}`)
    return response.data
  }

  async createVPSInstance(data) {
    const response = await api.post('/infrastructure/vps', data)
    return response.data
  }

  async deleteVPSInstance(vpsName) {
    const response = await api.delete(`/infrastructure/vps/${vpsName}`)
    return response.data
  }

  async startVPSInstance(vpsName) {
    const response = await api.post(`/infrastructure/vps/${vpsName}/start`)
    return response.data
  }

  async stopVPSInstance(vpsName) {
    const response = await api.post(`/infrastructure/vps/${vpsName}/stop`)
    return response.data
  }

  async rebootVPSInstance(vpsName) {
    const response = await api.post(`/infrastructure/vps/${vpsName}/reboot`)
    return response.data
  }

  // ============================================================================
  // User Management API Methods
  // ============================================================================

  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/portal/users?${params.toString()}`);
    return response.data;
  }

  async getUser(userId) {
    const response = await api.get(`/portal/users/${userId}`);
    return response.data;
  }

  async createUser(userData) {
    const response = await api.post('/portal/users', userData);
    return response.data;
  }

  async updateUser(userId, userData) {
    const response = await api.put(`/portal/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId) {
    const response = await api.delete(`/portal/users/${userId}`);
    return response.data;
  }

  async updateUserPermissions(userId, permissions) {
    const response = await api.put(`/portal/users/${userId}/permissions`, { permissions });
    return response.data;
  }

  // ============================================================================
  // Roles Management API Methods
  // ============================================================================

  async getRoles() {
    const response = await api.get('/portal/roles');
    return response.data;
  }

  async getRole(roleId) {
    const response = await api.get(`/portal/roles/${roleId}`);
    return response.data;
  }

  async createRole(roleData) {
    const response = await api.post('/portal/roles', roleData);
    return response.data;
  }

  async updateRole(roleId, roleData) {
    const response = await api.put(`/portal/roles/${roleId}`, roleData);
    return response.data;
  }

  async deleteRole(roleId) {
    const response = await api.delete(`/portal/roles/${roleId}`);
    return response.data;
  }

  // ============================================================================
  // Permissions Management API Methods
  // ============================================================================

  async getPermissions() {
    const response = await api.get('/portal/permissions');
    return response.data;
  }

  async getPermission(permissionId) {
    const response = await api.get(`/portal/permissions/${permissionId}`);
    return response.data;
  }

  async createPermission(permissionData) {
    const response = await api.post('/portal/permissions', permissionData);
    return response.data;
  }

  async updatePermission(permissionId, permissionData) {
    const response = await api.put(`/portal/permissions/${permissionId}`, permissionData);
    return response.data;
  }

  async deletePermission(permissionId) {
    const response = await api.delete(`/portal/permissions/${permissionId}`);
    return response.data;
  }

  // ============================================================================
  // Logs API Methods
  // ============================================================================

  async getLogs(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/logs?${params.toString()}`)
    return response.data
  }

  async getSystemLogs(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/logs/system?${params.toString()}`)
    return response.data
  }

  async searchLogs(query, filters = {}) {
    const params = new URLSearchParams({ ...filters, q: query })
    const response = await api.get(`/logs/search?${params.toString()}`)
    return response.data
  }

  // ============================================================================
  // Session Management API Methods
  // ============================================================================

  /**
   * Get organization's session policy
   * @returns {Promise} Session policy settings
   */
  async getSessionPolicy() {
    const response = await api.get('/organizations/session-policy')
    return response.data
  }

  /**
   * Update organization's session policy
   * @param {Object} policyData - Session policy configuration
   * @param {boolean} enforceImmediately - Whether to revoke existing sessions
   * @returns {Promise} Updated session policy
   */
  async updateSessionPolicy(policyData, enforceImmediately = false) {
    const response = await api.put('/organizations/session-policy', {
      ...policyData,
      enforceImmediately
    })
    return response.data
  }

  /**
   * Get active sessions for current user
   * @returns {Promise} List of active sessions
   */
  async getActiveSessions() {
    const response = await api.get('/auth/sessions')
    return response.data
  }

  /**
   * Revoke a specific session
   * @param {string} sessionId - Session ID to revoke
   * @returns {Promise} Revocation result
   */
  async revokeSession(sessionId) {
    const response = await api.delete(`/auth/sessions/${sessionId}`)
    return response.data
  }

  /**
   * Revoke all other sessions (logout from all other devices)
   * @returns {Promise} Revocation result
   */
  async revokeAllSessions() {
    const response = await api.delete('/auth/sessions')
    return response.data
  }
}

// Export singleton instance
export default new APIService()

// Also export the axios instance for direct use if needed
export { api }
