/**
 * Base API client for Nexus HRIS
 * Configured to work with the backend at /api/products/nexus
 * 
 * SECURITY: Authentication is handled by @recruitiq/auth package with httpOnly cookies
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

// Store CSRF token in memory (safe to store in JS, not secret like access tokens)
let csrfToken: string | null = null;

// Create axios instance with default config
// Use relative API paths proxied by Vite (same-origin for cookie auth)
const API_BASE_URL = '/api';
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/products/nexus`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // Important: send cookies with same-origin requests
});

// Request interceptor for adding CSRF token
api.interceptors.request.use(
  async (config) => {
    // SECURITY: Auth tokens are in httpOnly cookies, sent automatically by browser
    // No need to manually add Authorization header
    
    // Add CSRF token to POST, PUT, PATCH, DELETE requests
    const mutatingMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && mutatingMethods.includes(config.method.toLowerCase())) {
      // Lazy fetch CSRF token if not available
      const isAuthRequest = config.url?.includes('/auth/') || config.headers?.['skip-auth'];
      if (!csrfToken && !config.url?.includes('/csrf-token') && !isAuthRequest) {
        console.log('[Nexus API] No CSRF token found, fetching lazily...');
        try {
          const csrfResponse = await axios.get(`${API_BASE_URL}/csrf-token`, {
            withCredentials: true
          });
          csrfToken = csrfResponse.data?.csrfToken;
          if (csrfToken) {
            console.log('[Nexus API] CSRF token fetched and stored');
          }
        } catch (err: any) {
          console.warn('[Nexus API] Failed to fetch CSRF token:', err.response?.status || err.message);
          // If it's a 401, session expired - redirect handled by @recruitiq/auth
          if (err.response?.status === 401) {
            console.log('[Nexus API] CSRF fetch failed - session expired');
          }
        }
      }
      
      // Add CSRF token to request headers if available
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    // SECURITY: Token refresh is handled by @recruitiq/auth package
    // This interceptor only handles error formatting
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || error.response.statusText;
      
      // 401 errors are handled by @recruitiq/auth AuthContext
      // It will automatically redirect to login
      
      return Promise.reject({
        message,
        code: error.response.status,
        details: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
      });
    } else {
      // Something else happened
      return Promise.reject({
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      });
    }
  }
);

// Generic API methods with automatic data extraction
export const apiClient = {
  get: async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<{ success: boolean; data: T }>(url, config);
    return response.data.data;
  },

  post: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.post<{ success: boolean; data: T }>(url, data, config);
    return response.data.data;
  },

  patch: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.patch<{ success: boolean; data: T }>(url, data, config);
    return response.data.data;
  },

  put: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.put<{ success: boolean; data: T }>(url, data, config);
    return response.data.data;
  },

  delete: async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<{ success: boolean; data: T }>(url, config);
    return response.data.data;
  },
};

export default api;
