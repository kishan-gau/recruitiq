import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface APIClientConfig {
  baseURL?: string;
  timeout?: number;
  withCredentials?: boolean;
}

export interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string, refreshToken?: string, expiresIn?: number) => void;
  clearTokens: () => void;
  getRefreshToken: () => string | null;
  isTokenExpired: () => boolean;
}

/**
 * Core API Client with authentication and error handling
 * Provides base HTTP client with token management and interceptors
 */
export class APIClient {
  private client: AxiosInstance;
  private tokenStorage: TokenStorage;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(config: APIClientConfig = {}, tokenStorage?: TokenStorage) {
    const baseURL = config.baseURL || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '/api';
    
    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      withCredentials: config.withCredentials !== undefined ? config.withCredentials : true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Use provided token storage or default localStorage implementation
    this.tokenStorage = tokenStorage || this.createDefaultTokenStorage();

    this.setupInterceptors();
  }

  /**
   * Default token storage implementation using localStorage
   */
  private createDefaultTokenStorage(): TokenStorage {
    const TOKEN_KEY = '__recruitiq_access_token';
    const REFRESH_TOKEN_KEY = '__recruitiq_refresh_token';
    const TOKEN_EXPIRY_KEY = '__recruitiq_token_expiry';

    return {
      getToken: () => {
        try {
          const token = localStorage.getItem(TOKEN_KEY);
          const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

          if (!token) return null;

          if (expiry && Date.now() > parseInt(expiry)) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
            return null;
          }

          return token;
        } catch {
          return null;
        }
      },

      setToken: (token: string, refreshToken?: string, expiresIn: number = 604800) => {
        try {
          const expiryTime = Date.now() + expiresIn * 1000;
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
          if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          }
        } catch (error) {
          console.error('Failed to store tokens:', error);
        }
      },

      clearTokens: () => {
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(TOKEN_EXPIRY_KEY);
        } catch (error) {
          console.error('Failed to clear tokens:', error);
        }
      },

      getRefreshToken: () => {
        try {
          return localStorage.getItem(REFRESH_TOKEN_KEY);
        } catch {
          return null;
        }
      },

      isTokenExpired: () => {
        try {
          const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
          if (!expiry) return true;
          
          // Consider expired if less than 5 minutes remaining
          const fiveMinutes = 5 * 60 * 1000;
          return Date.now() > parseInt(expiry) - fiveMinutes;
        } catch {
          return true;
        }
      },
    };
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.tokenStorage.getToken();
        if (token && !config.headers['skip-auth']) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Remove custom skip-auth header
        delete config.headers['skip-auth'];
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          const skipRefreshUrls = ['/auth/login', '/auth/refresh', '/auth/logout'];
          const shouldSkipRefresh = skipRefreshUrls.some((url) =>
            originalRequest.url?.includes(url)
          );

          if (!shouldSkipRefresh) {
            originalRequest._retry = true;

            if (!this.isRefreshing) {
              this.isRefreshing = true;

              try {
                const newToken = await this.refreshAccessToken();
                this.isRefreshing = false;
                this.onTokenRefreshed(newToken);
                this.refreshSubscribers = [];
                
                // Retry original request with new token
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return this.client(originalRequest);
              } catch (refreshError) {
                this.isRefreshing = false;
                this.refreshSubscribers = [];
                this.tokenStorage.clearTokens();
                
                // Redirect to login
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                  window.location.href = '/login?reason=session_expired';
                }
                
                return Promise.reject(refreshError);
              }
            }

            // Queue request while refresh is in progress
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.client.post('/auth/refresh', { refreshToken });
      const { token, refreshToken: newRefreshToken, expiresIn } = response.data;
      
      this.tokenStorage.setToken(token, newRefreshToken, expiresIn);
      return token;
    } catch (error) {
      this.tokenStorage.clearTokens();
      throw error;
    }
  }

  /**
   * Notify subscribers of token refresh
   */
  private onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  /**
   * Get the underlying axios instance
   */
  public getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Make a GET request
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get token storage interface
   */
  public getTokenStorage(): TokenStorage {
    return this.tokenStorage;
  }
}
