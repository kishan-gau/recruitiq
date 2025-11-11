/**
 * Base API client for Nexus HRIS
 * Configured to work with the backend at /api/nexus
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { authService } from './auth.service';

// Store CSRF token in memory (safe to store in JS, not secret like access tokens)
let csrfToken: string | null = null;

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: '/api/nexus',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth token and CSRF token
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token to POST, PUT, PATCH, DELETE requests
    const mutatingMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && mutatingMethods.includes(config.method.toLowerCase())) {
      // Lazy fetch CSRF token if not available
      const isAuthRequest = config.url?.includes('/auth/') || config.headers?.['skip-auth'];
      if (!csrfToken && !config.url?.includes('/csrf-token') && !isAuthRequest) {
        console.log('[Nexus API] No CSRF token found, fetching lazily...');
        try {
          const csrfResponse = await axios.get('/api/csrf-token');
          csrfToken = csrfResponse.data?.csrfToken;
          if (csrfToken) {
            console.log('[Nexus API] CSRF token fetched and stored');
          }
        } catch (err: any) {
          console.warn('[Nexus API] Failed to fetch CSRF token:', err.response?.status || err.message);
          // If it's a 401, redirect to login
          if (err.response?.status === 401) {
            console.log('[Nexus API] CSRF fetch failed - session expired, redirecting to login');
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?reason=session_expired&returnTo=${returnTo}`;
            throw new Error('Authentication required. Please log in again.');
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

// Response interceptor for handling errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const newToken = await authService.refresh();
        
        // Update the Authorization header
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Fetch fresh CSRF token after successful token refresh
        try {
          const csrfResponse = await axios.get('/api/csrf-token');
          csrfToken = csrfResponse.data?.csrfToken;
          if (csrfToken) {
            console.log('[Nexus API] CSRF token refreshed after token rotation');
          }
        } catch (csrfErr) {
          console.warn('[Nexus API] Failed to refresh CSRF token after token rotation:', csrfErr);
        }
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        csrfToken = null; // Clear CSRF token
        
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?reason=session_expired&returnTo=${returnTo}`;
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.statusText;
      
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
