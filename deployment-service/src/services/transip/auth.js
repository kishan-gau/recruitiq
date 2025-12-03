import crypto from 'crypto';
import fs from 'fs';
import axios from 'axios';
import config from '../../config/index.js';

class TransIPAuth {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Sign the request body with RSA SHA512
   * @param {string} body - JSON stringified request body
   * @returns {string} Base64 encoded signature
   */
  signRequest(body) {
    try {
      const privateKey = fs.readFileSync(config.transip.privateKeyPath, 'utf8');
      const sign = crypto.createSign('RSA-SHA512');
      sign.update(body);
      const signature = sign.sign(privateKey, 'base64');
      return signature;
    } catch (error) {
      throw new Error(`Failed to sign request: ${error.message}`);
    }
  }

  /**
   * Authenticate with TransIP and get a bearer token
   * @returns {Promise<string>} Bearer token
   */
  async authenticate() {
    const requestBody = {
      login: config.transip.accountName,
      nonce: Date.now().toString(),
      read_only: config.transip.readOnly,
      expiration_time: config.transip.tokenExpiry === 0 ? 'never' : `${config.transip.tokenExpiry} seconds`,
      label: 'RecruitIQ Deployment Service',
      global_key: true,
    };

    const body = JSON.stringify(requestBody);
    const signature = this.signRequest(body);

    try {
      const response = await axios.post(
        `${config.transip.apiUrl}/auth`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Signature': signature,
          },
        }
      );

      this.token = response.data.token;
      // Calculate expiry time (leaving 1 minute buffer)
      this.tokenExpiry = Date.now() + ((config.transip.tokenExpiry - 60) * 1000);

      console.log('[TransIP Auth] Successfully authenticated', {
        readOnly: config.transip.readOnly,
        expiresIn: config.transip.tokenExpiry,
      });

      return this.token;
    } catch (error) {
      console.error('[TransIP Auth] Authentication failed:', error.response?.data || error.message);
      throw new Error(`TransIP authentication failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get a valid token, refreshing if necessary
   * @returns {Promise<string>} Valid bearer token
   */
  async getToken() {
    // If token is still valid, return it
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh
    this.isRefreshing = true;
    this.refreshPromise = this.authenticate()
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Make an authenticated request to TransIP API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint (relative to base URL)
   * @param {object} data - Request body (for POST/PUT/PATCH)
   * @param {object} params - Query parameters
   * @returns {Promise<any>} Response data
   */
  async request(method, endpoint, data = null, params = null) {
    const token = await this.getToken();
    const url = `${config.transip.apiUrl}${endpoint}`;

    const requestConfig = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      requestConfig.data = data;
    }

    if (params) {
      requestConfig.params = params;
    }

    try {
      const response = await axios(requestConfig);
      return response.data;
    } catch (error) {
      // Log error details
      console.error('[TransIP API] Request failed:', {
        method,
        endpoint,
        status: error.response?.status,
        error: error.response?.data || error.message,
      });

      // If token expired, try refreshing once
      if (error.response?.status === 401 && this.token) {
        console.log('[TransIP API] Token expired, refreshing...');
        this.token = null;
        this.tokenExpiry = null;
        
        // Retry once with new token
        const newToken = await this.getToken();
        requestConfig.headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await axios(requestConfig);
        return retryResponse.data;
      }

      throw error;
    }
  }

  /**
   * Clear the cached token (useful for logout or testing)
   */
  clearToken() {
    this.token = null;
    this.tokenExpiry = null;
  }
}

// Export singleton instance
export default new TransIPAuth();
