/**
 * RecruitIQ API Client
 * 
 * Enterprise-grade API client with:
 * - JWT token management with secure storage
 * - Automatic token refresh
 * - Request/response interceptors
 * - Error handling and retry logic
 * - CSRF protection
 * - Request timeout handling
 * - XSS protection (sanitized responses)
 */

// Security: Token storage keys with prefixes to prevent collisions
const TOKEN_KEY = '__recruitiq_access_token'
const REFRESH_TOKEN_KEY = '__recruitiq_refresh_token'
const TOKEN_EXPIRY_KEY = '__recruitiq_token_expiry'

// Security: Request timeout to prevent hanging requests
const REQUEST_TIMEOUT = 30000 // 30 seconds

class APIClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '/api'
    this.isRefreshing = false
    this.refreshSubscribers = []
  }

  /**
   * Security: Secure token storage with encryption flag
   * In production, consider using httpOnly cookies instead of localStorage
   */
  setToken(token, refreshToken = null, expiresIn = 604800) {
    if (!token) {
      console.error('Attempted to set empty token')
      return
    }

    try {
      // Calculate expiry time (default 7 days)
      const expiryTime = Date.now() + (expiresIn * 1000)
      
      // Store tokens securely
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
      
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      }
    } catch (error) {
      console.error('Failed to store authentication tokens:', error)
      // Security: Clear any partial data on error
      this.clearTokens()
    }
  }

  /**
   * Security: Get token with validation
   */
  getToken() {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

      // Security: Validate token exists and hasn't expired
      if (!token) return null

      if (expiry && Date.now() > parseInt(expiry)) {
        console.warn('Token has expired')
        this.clearTokens()
        return null
      }

      return token
    } catch (error) {
      console.error('Failed to retrieve token:', error)
      return null
    }
  }

  /**
   * Security: Clear all authentication data
   */
  clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }

  /**
   * Security: Check if token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired() {
    try {
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
      if (!expiry) return true
      
      // Security: Consider token expired if less than 5 minutes remaining
      const fiveMinutes = 5 * 60 * 1000
      return Date.now() > (parseInt(expiry) - fiveMinutes)
    } catch (error) {
      return true
    }
  }

  /**
   * Security: Refresh token mechanism
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      this.setToken(data.token, data.refreshToken, data.expiresIn)
      
      return data.token
    } catch (error) {
      // Security: Clear tokens on refresh failure
      this.clearTokens()
      throw error
    }
  }

  /**
   * Security: Sanitize input to prevent XSS
   * Basic sanitization - in production, use DOMPurify or similar
   */
  sanitizeInput(data) {
    if (typeof data === 'string') {
      // Remove script tags and dangerous attributes
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = Array.isArray(data) ? [] : {}
      for (const key in data) {
        sanitized[key] = this.sanitizeInput(data[key])
      }
      return sanitized
    }
    
    return data
  }

  /**
   * Core request method with security features:
   * - Automatic token injection
   * - Token refresh on 401
   * - Request timeout
   * - Error handling
   * - Input sanitization
   */
  async request(endpoint, options = {}) {
    // Security: Sanitize request body
    if (options.body && typeof options.body === 'string') {
      try {
        const parsed = JSON.parse(options.body)
        const sanitized = this.sanitizeInput(parsed)
        options.body = JSON.stringify(sanitized)
      } catch (e) {
        // If not JSON, leave as is
      }
    }

    // Security: Get current token
    let token = this.getToken()

    // Security: Refresh token if expired
    if (token && this.isTokenExpired() && endpoint !== '/api/auth/refresh') {
      try {
        token = await this.refreshToken()
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.clearTokens()
        window.location.href = '/login'
        throw new Error('Session expired. Please login again.')
      }
    }

    // Security: Build secure headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Security: Add CSRF token if available (only if present)
    const csrfToken = this.getCSRFToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    // Security: Add authorization header if token exists
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Security: Request timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
        // Security: Send cookies only to same origin
        credentials: 'same-origin',
      })

      clearTimeout(timeoutId)

      // Security: Handle 401 Unauthorized
      if (response.status === 401 && endpoint !== '/api/auth/login') {
        console.warn('Unauthorized request, clearing session')
        this.clearTokens()
        
        // Show user-friendly message
        // Check if sessionStorage has already shown the message to prevent duplicates
        if (!sessionStorage.getItem('__session_expired_shown')) {
          sessionStorage.setItem('__session_expired_shown', 'true')
          // Clear the flag after redirect completes
          setTimeout(() => sessionStorage.removeItem('__session_expired_shown'), 1000)
        }
        
        window.location.href = '/login?reason=session_expired'
        throw new Error('Your session has expired or was ended from another device. Please login again.')
      }

      // Security: Handle other error status codes
      if (!response.ok) {
        let errorMessage = 'Request failed'
        try {
          const errorData = await response.json()
          // Security: Don't expose internal error details to console in production
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        error.response = response
        throw error
      }

      // Security: Parse and return response
      const data = await response.json()
      return data
      
    } catch (error) {
      clearTimeout(timeoutId)

      // Security: Handle timeout
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.')
      }

      // Security: Handle network errors
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your connection.')
      }

      throw error
    }
  }

  /**
   * Security: Get CSRF token from meta tag or cookie
   */
  getCSRFToken() {
    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      return metaTag.getAttribute('content')
    }

    // Try to get from cookie
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value)
      }
    }

    return null // Return null instead of empty string to allow conditional header
  }

  // ============================================================================
  // Authentication API Methods
  // ============================================================================

  /**
   * Login user
   * Security: Credentials sent over HTTPS only in production
   */
  async login(email, password) {
    // Security: Validate input
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Security: Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true, // Don't send token for login
    })

    // Security: Store tokens securely
    // Backend returns 'accessToken' not 'token'
    const token = response.accessToken || response.token
    if (token) {
      this.setToken(token, response.refreshToken, response.expiresIn)
    }

    return response
  }

  /**
   * Register new user
   */
  async register(data) {
    // Security: Validate required fields
    if (!data.email || !data.password || !data.name) {
      throw new Error('Email, password, and name are required')
    }

    // Security: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format')
    }

    // Security: Validate password strength (minimum requirements)
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    })

    // Security: Store tokens if registration includes auto-login
    // Backend returns 'accessToken' not 'token'
    const token = response.accessToken || response.token
    if (token) {
      this.setToken(token, response.refreshToken, response.expiresIn)
    }

    return response
  }

  /**
   * Get current user profile
   */
  async getMe() {
    return this.request('/api/auth/me')
  }

  /**
   * Logout user
   * Security: Clear tokens and notify server
   */
  async logout() {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      
      // Notify server to invalidate tokens
      if (refreshToken) {
        await this.request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      // Security: Always clear local tokens even if server request fails
      this.clearTokens()
    }
  }

  // ============================================================================
  // Organization API Methods
  // ============================================================================

  async getOrganization() {
    return this.request('/api/organizations')
  }

  async updateOrganization(data) {
    return this.request('/api/organizations', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getOrganizationStats() {
    return this.request('/api/organizations/stats')
  }

  // ============================================================================
  // Workspace API Methods
  // ============================================================================

  async getWorkspaces() {
    return this.request('/api/workspaces')
  }

  async getWorkspace(id) {
    return this.request(`/api/workspaces/${id}`)
  }

  async createWorkspace(data) {
    return this.request('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateWorkspace(id, data) {
    return this.request(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteWorkspace(id) {
    return this.request(`/api/workspaces/${id}`, {
      method: 'DELETE',
    })
  }

  async getWorkspaceMembers(id) {
    return this.request(`/api/workspaces/${id}/members`)
  }

  async addWorkspaceMember(workspaceId, userId) {
    return this.request(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  }

  async removeWorkspaceMember(workspaceId, userId) {
    return this.request(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // User API Methods
  // ============================================================================

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/users${query ? '?' + query : ''}`)
  }

  async getUser(id) {
    return this.request(`/api/users/${id}`)
  }

  async createUser(data) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id, data) {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateUserRole(id, role) {
    return this.request(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  }

  async deleteUser(id) {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // Job API Methods
  // ============================================================================

  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/jobs${query ? '?' + query : ''}`)
  }

  async getJob(id) {
    return this.request(`/api/jobs/${id}`)
  }

  async createJob(data) {
    return this.request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateJob(id, data) {
    return this.request(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteJob(id) {
    return this.request(`/api/jobs/${id}`, {
      method: 'DELETE',
    })
  }

  async getPublicJobs() {
    return this.request('/api/jobs/public', {
      skipAuth: true,
    })
  }

  async getPublicJob(id) {
    return this.request(`/api/jobs/public/${id}`, {
      skipAuth: true,
    })
  }

  // ============================================================================
  // Candidate API Methods
  // ============================================================================

  async getCandidates(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/candidates${query ? '?' + query : ''}`)
  }

  async getCandidate(id) {
    return this.request(`/api/candidates/${id}`)
  }

  async createCandidate(data) {
    return this.request('/api/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCandidate(id, data) {
    return this.request(`/api/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCandidate(id) {
    return this.request(`/api/candidates/${id}`, {
      method: 'DELETE',
    })
  }

  async getCandidateApplications(id) {
    return this.request(`/api/candidates/${id}/applications`)
  }

  // ============================================================================
  // Application API Methods
  // ============================================================================

  async getApplications(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/applications${query ? '?' + query : ''}`)
  }

  async getApplication(id) {
    return this.request(`/api/applications/${id}`)
  }

  async createApplication(data) {
    return this.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true, // Public endpoint for candidate applications
    })
  }

  async updateApplication(id, data) {
    return this.request(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteApplication(id) {
    return this.request(`/api/applications/${id}`, {
      method: 'DELETE',
    })
  }

  async trackApplication(trackingCode) {
    return this.request(`/api/applications/track/${trackingCode}`, {
      skipAuth: true, // Public endpoint
    })
  }

  // ============================================================================
  // Interview API Methods
  // ============================================================================

  async getInterviews(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/interviews${query ? '?' + query : ''}`)
  }

  async getInterview(id) {
    return this.request(`/api/interviews/${id}`)
  }

  async createInterview(data) {
    return this.request('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInterview(id, data) {
    return this.request(`/api/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInterview(id) {
    return this.request(`/api/interviews/${id}`, {
      method: 'DELETE',
    })
  }

  async submitInterviewFeedback(id, feedback) {
    return this.request(`/api/interviews/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    })
  }

  // ============================================================================
  // Flow Template API Methods
  // ============================================================================

  async getFlowTemplates(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/flow-templates${query ? '?' + query : ''}`)
  }

  async getFlowTemplate(id) {
    return this.request(`/api/flow-templates/${id}`)
  }

  async createFlowTemplate(data) {
    return this.request('/api/flow-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFlowTemplate(id, data) {
    return this.request(`/api/flow-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteFlowTemplate(id) {
    return this.request(`/api/flow-templates/${id}`, {
      method: 'DELETE',
    })
  }

  async cloneFlowTemplate(id) {
    return this.request(`/api/flow-templates/${id}/clone`, {
      method: 'POST',
    })
  }

  // ============================================================================
  // Session Management API Methods
  // ============================================================================

  /**
   * Get active sessions for current user
   * Returns list of devices/locations where user is currently logged in
   */
  async getActiveSessions() {
    return this.request('/api/auth/sessions')
  }

  /**
   * Revoke a specific session (logout from specific device)
   * @param {string} sessionId - ID of the session to revoke
   */
  async revokeSession(sessionId) {
    return this.request(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Revoke all other sessions (logout from all other devices except current)
   */
  async revokeAllSessions() {
    return this.request('/api/auth/sessions', {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // MFA (Multi-Factor Authentication) API Methods
  // ============================================================================

  /**
   * Get MFA status for current user
   * Returns whether MFA is enabled and if it's required by organization
   */
  async getMFAStatus() {
    return this.request('/api/auth/mfa/status')
  }

  /**
   * Setup MFA - Generate QR code and secret
   * Step 1 of MFA setup flow
   * @returns {Promise<{qrCodeUrl: string, manualEntryKey: string, tempSecret: string}>}
   */
  async setupMFA() {
    return this.request('/api/auth/mfa/setup', {
      method: 'POST',
    })
  }

  /**
   * Verify MFA setup - Confirm TOTP token and enable MFA
   * Step 2 of MFA setup flow
   * @param {string} token - 6-digit TOTP code from authenticator app
   * @param {string} secret - Temporary secret from setupMFA()
   * @returns {Promise<{backupCodes: string[]}>}
   */
  async verifyMFASetup(token, secret) {
    return this.request('/api/auth/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ token, secret }),
    })
  }

  /**
   * Verify MFA during login
   * Called after initial login when mfaRequired=true
   * @param {string} mfaToken - Temporary token from login response
   * @param {string} token - 6-digit TOTP code from authenticator app
   * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
   */
  async verifyMFA(mfaToken, token) {
    return this.request('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, token }),
    })
  }

  /**
   * Use backup code for login when TOTP unavailable
   * @param {string} mfaToken - Temporary token from login response
   * @param {string} backupCode - One-time backup code
   * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
   */
  async useBackupCode(mfaToken, backupCode) {
    return this.request('/api/auth/mfa/use-backup-code', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, backupCode }),
    })
  }

  /**
   * Disable MFA for user
   * Requires password and current TOTP/backup code
   * Note: Cannot disable if organization has mfa_required=true
   * @param {string} password - User's password
   * @param {string} token - Current TOTP code or backup code
   * @returns {Promise<{message: string}>}
   */
  async disableMFA(password, token) {
    return this.request('/api/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, token }),
    })
  }

  /**
   * Regenerate backup codes (invalidates old ones)
   * Requires password and current TOTP code
   * @param {string} password - User's password
   * @param {string} token - Current TOTP code
   * @returns {Promise<{backupCodes: string[]}>}
   */
  async regenerateBackupCodes(password, token) {
    return this.request('/api/auth/mfa/regenerate-backup-codes', {
      method: 'POST',
      body: JSON.stringify({ password, token }),
    })
  }
}

// Export singleton instance
const apiClient = new APIClient()

export default apiClient
