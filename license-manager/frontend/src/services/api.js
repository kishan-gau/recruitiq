// Real API service for License Manager backend
import axios from 'axios'

// API Configuration - uses relative URL with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies for SSO
})

// No token management needed - tokens are in HTTP-only cookies
// Cookies are automatically sent with every request

// Response interceptor for error handling
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

// API Service
class APIService {
  // Authentication
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    // Tokens are automatically set as HTTP-only cookies by the backend
    const { user } = response.data
    
    // Store user data in localStorage for convenience (non-sensitive)
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    }
    return response.data
  }

  async logout() {
    // Call backend logout endpoint
    // Tokens are automatically sent via cookies and cleared by backend
    try {
      await api.post('/auth/logout', {})
    } catch (err) {
      console.error('Logout error:', err)
      // Continue with local logout even if backend call fails
    }
    
    // Clear user data from localStorage (cookies are cleared by backend)
    localStorage.removeItem('user')
  }

  async getMe() {
    const response = await api.get('/auth/me')
    return response.data.user
  }

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
      contractMonths: data.contractMonths || 12
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
    // Use deployment service URL if configured, otherwise use main API
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.post(`${deploymentBaseURL}/api/deployments`, deploymentData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Get deployment status
   * @param {string} jobId - Deployment job ID
   * @returns {Promise} Deployment status
   */
  async getDeploymentStatus(jobId) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.get(`${deploymentBaseURL}/api/deployments/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Cancel a deployment
   * @param {string} jobId - Deployment job ID
   * @returns {Promise} Cancellation result
   */
  async cancelDeployment(jobId) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.delete(`${deploymentBaseURL}/api/deployments/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Get deployment queue statistics
   * @returns {Promise} Queue statistics
   */
  async getDeploymentStats() {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.get(`${deploymentBaseURL}/api/deployments/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Get instance details
   * @param {string} vpsName - VPS name
   * @returns {Promise} Instance details
   */
  async getInstanceDetails(vpsName) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.get(`${deploymentBaseURL}/api/instances/${vpsName}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Start an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async startInstance(vpsName) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.post(`${deploymentBaseURL}/api/instances/${vpsName}/start`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Stop an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async stopInstance(vpsName) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.post(`${deploymentBaseURL}/api/instances/${vpsName}/stop`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Reboot an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async rebootInstance(vpsName) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.post(`${deploymentBaseURL}/api/instances/${vpsName}/reboot`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Delete an instance
   * @param {string} vpsName - VPS name
   * @returns {Promise} Result
   */
  async deleteInstance(vpsName) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.delete(`${deploymentBaseURL}/api/instances/${vpsName}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    return response.data
  }

  /**
   * Create a snapshot of an instance
   * @param {string} vpsName - VPS name
   * @param {string} description - Snapshot description
   * @returns {Promise} Snapshot details
   */
  async createSnapshot(vpsName, description) {
    const deploymentBaseURL = import.meta.env.VITE_DEPLOYMENT_API_URL || API_BASE_URL.replace('/api', '')
    
    const response = await axios.post(`${deploymentBaseURL}/api/instances/${vpsName}/snapshots`, 
      { description },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      }
    )

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
}

export default new APIService()
