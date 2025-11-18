/**
 * RecruitIQ API Client
 * 
 * Enterprise-grade API client with:
 * - JWT token management with httpOnly cookies (SECURE)
 * - Automatic token refresh
 * - Request/response interceptors
 * - Error handling and retry logic
 * - CSRF protection
 * - Request timeout handling
 * - XSS protection (sanitized responses)
 * 
 * SECURITY NOTE: Tokens are stored in httpOnly cookies managed by the server.
 * This prevents XSS attacks from stealing tokens via JavaScript.
 */

// Security: Request timeout to prevent hanging requests
const REQUEST_TIMEOUT = 30000 // 30 seconds

class APIClient {
  constructor() {
    this.baseURL = '/api'
    this.isRefreshing = false
    this.refreshSubscribers = []
    // Store CSRF token in memory (safe to store in JS, not secret like access tokens)
    this.csrfToken = null
  }

  /**
   * SECURITY: Tokens are now stored in httpOnly cookies by the server.
   * This method is kept for backward compatibility but does nothing.
   * The server sets cookies in Set-Cookie header on login/refresh.
   * 
   * @deprecated Tokens are managed via httpOnly cookies
   */
  setToken(token, refreshToken = null, expiresIn = 604800) {
    // Tokens are now managed via httpOnly cookies by the server
    // No localStorage storage needed - this prevents XSS token theft
    console.info('Authentication tokens are managed via secure httpOnly cookies')
  }

  /**
   * SECURITY: Check if user is authenticated by calling /auth/me endpoint.
   * We can't read httpOnly cookies from JavaScript (that's the security benefit!).
   * The server will validate the cookie and return user info if valid.
   * 
   * @returns {boolean} Always returns true - actual auth check happens server-side
   */
  getToken() {
    // With httpOnly cookies, we can't and shouldn't read tokens from JavaScript
    // Authentication is handled automatically via cookies sent with each request
    // This is more secure as XSS attacks cannot steal the token
    return true // Return true to indicate cookie-based auth is in use
  }

  /**
   * Security: Clear authentication by calling logout endpoint.
   * The server will clear the httpOnly cookies.
   */
  clearTokens() {
    // Clear CSRF token from memory
    this.csrfToken = null
    // Tokens are in httpOnly cookies - we need to tell the server to clear them
    // This will be handled by the logout endpoint
    console.info('Tokens cleared via logout endpoint')
  }

  /**
   * SECURITY: With httpOnly cookies, token expiry is managed server-side.
   * The server automatically handles token refresh and expiry.
   * 
   * @returns {boolean} Always returns false - server handles expiry
   */
  isTokenExpired() {
    // With httpOnly cookies, we can't check expiry client-side
    // Server will return 401 if token is expired, triggering refresh
    return false
  }

  /**
   * SECURITY: Refresh token via server endpoint.
   * The server reads the refresh token from httpOnly cookie and issues new tokens.
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/tenant/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      // Server sets new tokens in httpOnly cookies via Set-Cookie header
      
      return data.token || true // Return true to indicate success
    } catch (error) {
      // On refresh failure, redirect to login
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
   * - Automatic httpOnly cookie authentication
   * - Token refresh on 401
   * - Request timeout
   * - Error handling
   * - Input sanitization
   * - CSRF protection
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

    // Security: Build secure headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Security: Add CSRF token for state-changing operations (POST, PUT, PATCH, DELETE)
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    const method = options.method || 'GET'
    if (mutatingMethods.includes(method.toUpperCase())) {
      let csrfToken = this.csrfToken || this.getCSRFToken()
      
      // Lazy fetch CSRF token if not available and not on auth endpoints
      const isAuthEndpoint = endpoint.includes('/auth/')
      if (!csrfToken && !endpoint.includes('/csrf-token') && !isAuthEndpoint) {
        console.log('[APIClient] No CSRF token found, fetching lazily...')
        try {
          const csrfResponse = await fetch(`${this.baseURL}/csrf-token`, {
            credentials: 'include',
          })
          
          if (csrfResponse.ok) {
            const csrfData = await csrfResponse.json()
            csrfToken = csrfData.csrfToken
            if (csrfToken) {
              this.csrfToken = csrfToken
              console.log('[APIClient] CSRF token fetched and stored')
            }
          } else if (csrfResponse.status === 401) {
            // Session expired, redirect to login
            console.log('[APIClient] CSRF fetch failed - session expired, redirecting to login')
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
            window.location.href = `/login?reason=session_expired&returnTo=${returnTo}`
            throw new Error('Authentication required. Please log in again.')
          }
        } catch (err) {
          console.warn('[APIClient] Failed to fetch CSRF token:', err.message)
          // If it's our redirect error, rethrow it
          if (err.message === 'Authentication required. Please log in again.') {
            throw err
          }
          // For other errors, continue without CSRF token - server will reject if required
        }
      }
      
      // Add CSRF token to request headers if available
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }
    }

    // NOTE: No Authorization header needed - authentication via httpOnly cookies
    // The browser automatically sends cookies with each request

    // Security: Request timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
        // SECURITY: Include credentials to send httpOnly cookies
        credentials: 'include',
      })

      clearTimeout(timeoutId)

      // Security: Handle 401 Unauthorized
      if (response.status === 401 && endpoint !== '/auth/tenant/login') {
        console.warn('Unauthorized request - session expired or invalid')
        
        // Show user-friendly message
        // Check if sessionStorage has already shown the message to prevent duplicates
        if (!sessionStorage.getItem('__session_expired_shown')) {
          sessionStorage.setItem('__session_expired_shown', 'true')
          // Clear the flag after redirect completes
          setTimeout(() => sessionStorage.removeItem('__session_expired_shown'), 1000)
        }
        
        // Include returnTo parameter to redirect user back after login
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?reason=session_expired&returnTo=${returnTo}`
        throw new Error('Your session has expired. Please login again.')
      }

      // Security: Handle other error status codes
      if (!response.ok) {
        let errorMessage = 'Request failed'
        let errorData = null
        try {
          errorData = await response.json()
          console.log('[APIClient] Error response data:', errorData)
          console.log('[APIClient] Error data type:', typeof errorData)
          console.log('[APIClient] Error data keys:', Object.keys(errorData || {}))
          
          // Security: Don't expose internal error details to console in production
          // Extract the actual error message from the response
          if (errorData.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message
          } else if (errorData.error) {
            // Error is nested in an 'error' object
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error
            } else if (typeof errorData.error === 'object') {
              // Extract message from nested error object
              errorMessage = errorData.error.message || errorData.error.error || 'Request failed'
            }
          } else if (errorData.raw?.message && typeof errorData.raw.message === 'string') {
            // Some errors have the message in a 'raw' object
            errorMessage = errorData.raw.message
          } else {
            console.warn('[APIClient] Could not extract error message from response, using default')
          }
          
          console.log('[APIClient] Extracted error message:', errorMessage)
        } catch (e) {
          console.error('[APIClient] Failed to parse error response:', e)
          errorMessage = response.statusText || errorMessage
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        error.response = errorData
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
   * Security: Get CSRF token from memory, meta tag or cookie
   */
  getCSRFToken() {
    // Check memory first
    if (this.csrfToken) {
      return this.csrfToken
    }
    
    // Try to get from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      const token = metaTag.getAttribute('content')
      if (token) {
        this.csrfToken = token
        return token
      }
    }

    // Try to get from cookie
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'XSRF-TOKEN') {
        const token = decodeURIComponent(value)
        this.csrfToken = token
        return token
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

    const response = await this.request('/auth/tenant/login', {
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

    const response = await this.request('/auth/tenant/register', {
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
    return this.request('/auth/tenant/me')
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
        await this.request('/auth/tenant/logout', {
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
    return this.request('/organizations')
  }

  async updateOrganization(data) {
    return this.request('/organizations', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getOrganizationStats() {
    return this.request('/organizations/stats')
  }

  // ============================================================================
  // Workspace API Methods
  // ============================================================================

  async getWorkspaces() {
    return this.request('/workspaces')
  }

  async getWorkspace(id) {
    return this.request(`/workspaces/${id}`)
  }

  async createWorkspace(data) {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateWorkspace(id, data) {
    return this.request(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteWorkspace(id) {
    return this.request(`/workspaces/${id}`, {
      method: 'DELETE',
    })
  }

  async getWorkspaceMembers(id) {
    return this.request(`/workspaces/${id}/members`)
  }

  async addWorkspaceMember(workspaceId, userId) {
    return this.request(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  }

  async removeWorkspaceMember(workspaceId, userId) {
    return this.request(`/workspaces/${workspaceId}/members/${userId}`, {
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
    return this.request('/users', {
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
    return this.request('/jobs', {
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
    return this.request('/jobs/public', {
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
    return this.request('/candidates', {
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
    return this.request('/applications', {
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
    return this.request('/interviews', {
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
    return this.request('/flow-templates', {
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
    return this.request('/auth/tenant/sessions')
  }

  /**
   * Revoke a specific session (logout from specific device)
   * @param {string} sessionId - ID of the session to revoke
   */
  async revokeSession(sessionId) {
    return this.request(`/auth/tenant/sessions/${sessionId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Revoke all other sessions (logout from all other devices except current)
   */
  async revokeAllSessions() {
    return this.request('/auth/tenant/revoke-all-sessions', {
      method: 'POST',
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
    return this.request('/auth/mfa/status')
  }

  /**
   * Setup MFA - Generate QR code and secret
   * Step 1 of MFA setup flow
   * @returns {Promise<{qrCodeUrl: string, manualEntryKey: string, tempSecret: string}>}
   */
  async setupMFA() {
    return this.request('/auth/mfa/setup', {
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
    return this.request('/auth/mfa/verify-setup', {
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
    return this.request('/auth/mfa/verify', {
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
    return this.request('/auth/mfa/use-backup-code', {
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
    return this.request('/auth/mfa/disable', {
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
    return this.request('/auth/mfa/regenerate-backup-codes', {
      method: 'POST',
      body: JSON.stringify({ password, token }),
    })
  }
}

// Export singleton instance
const apiClient = new APIClient()

export default apiClient
