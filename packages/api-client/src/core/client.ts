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
  getCsrfToken: () => string | null;
  setCsrfToken: (token: string) => void;
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
   * Default token storage implementation using httpOnly cookies (SECURE)
   * 
   * SECURITY: Tokens are stored in httpOnly cookies by the backend server.
   * This prevents XSS attacks from stealing tokens via JavaScript.
   * 
   * The browser automatically sends cookies with each request.
   * We can't read the cookies from JavaScript (that's the security benefit!).
   */
  private createDefaultTokenStorage(): TokenStorage {
    // Store CSRF token in memory (it's safe to store in JS, not secret like access tokens)
    let csrfToken: string | null = null;

    return {
      // With httpOnly cookies, we can't read tokens from JavaScript
      // This is more secure as XSS attacks cannot steal the token
      getToken: () => {
        // Return a truthy value to indicate cookie-based auth is in use
        // The actual token is in httpOnly cookie sent automatically by browser
        return 'cookie-auth';
      },

      // SECURITY: Tokens are set in httpOnly cookies by the server via Set-Cookie header
      // This method is called after login but does nothing (cookies are managed server-side)
      setToken: (_token: string, _refreshToken?: string, _expiresIn: number = 604800) => {
        // Tokens are now managed via httpOnly cookies by the server
        // No client-side storage needed - this prevents XSS token theft
        console.info('Authentication tokens are managed via secure httpOnly cookies');
      },

      // SECURITY: Clear authentication by calling logout endpoint
      // The server will clear the httpOnly cookies
      clearTokens: () => {
        // Clear CSRF token from memory
        csrfToken = null;
        // Tokens are in httpOnly cookies - server will clear them via logout endpoint
        console.info('Tokens will be cleared via logout endpoint');
      },

      // With httpOnly cookies, refresh token is also in a cookie
      getRefreshToken: () => {
        // Refresh token is in httpOnly cookie, managed by server
        return 'cookie-auth';
      },

      // With httpOnly cookies, token expiry is managed server-side
      // The server will return 401 if token is expired, triggering refresh
      isTokenExpired: () => {
        // Server handles expiry check and returns 401 if expired
        return false;
      },

      // CSRF token can be stored in memory (it's not sensitive like access tokens)
      getCsrfToken: () => csrfToken,
      
      setCsrfToken: (token: string) => {
        csrfToken = token;
      },
    };
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // SECURITY: Request interceptor - Add CSRF token to mutating requests
    // Auth tokens are in httpOnly cookies, sent automatically by browser
    this.client.interceptors.request.use(
      (config) => {
        // Remove any skip-auth flags
        delete config.headers['skip-auth'];

        // Add CSRF token to POST, PUT, PATCH, DELETE requests (if available)
        const mutatingMethods = ['post', 'put', 'patch', 'delete'];
        if (config.method && mutatingMethods.includes(config.method.toLowerCase())) {
          const csrfToken = this.tokenStorage.getCsrfToken();
          
          // Add CSRF token to request headers if available
          if (csrfToken && config.headers) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }

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
          const skipRefreshUrls = [
            '/auth/login', 
            '/auth/refresh', 
            '/auth/logout',
            '/auth/tenant/login',
            '/auth/tenant/me',
            '/auth/tenant/refresh',
            '/auth/tenant/logout',
            '/auth/platform/login',
            '/auth/platform/me',
            '/auth/platform/refresh',
            '/auth/platform/logout'
          ];
          const shouldSkipRefresh = skipRefreshUrls.some((url) =>
            originalRequest.url?.includes(url)
          );

          if (!shouldSkipRefresh) {
            originalRequest._retry = true;

            if (!this.isRefreshing) {
              this.isRefreshing = true;

              try {
                await this.refreshAccessToken();
                this.isRefreshing = false;
                this.onTokenRefreshed('cookie-auth');
                this.refreshSubscribers = [];
                
                // Retry original request (cookie will be sent automatically)
                return this.client(originalRequest);
              } catch (refreshError) {
                this.isRefreshing = false;
                this.refreshSubscribers = [];
                this.tokenStorage.clearTokens();
                
                // Don't redirect if this is the initial auth check (/auth/tenant/me)
                // Let the AuthContext handle it gracefully
                const isInitialAuthCheck = originalRequest.url?.includes('/auth/tenant/me');
                
                console.log('[APIClient] Refresh failed:', {
                  url: originalRequest.url,
                  isInitialAuthCheck,
                  pathname: typeof window !== 'undefined' ? window.location.pathname : 'N/A'
                });
                
                // Redirect to login ONLY if not already on login page and NOT initial auth check
                if (!isInitialAuthCheck && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                  const currentPath = window.location.pathname;
                  const reason = 'session_expired';
                  if (currentPath !== '/login') {
                    console.log('[APIClient] Redirecting to login');
                    window.location.href = `/login?reason=${reason}`;
                  }
                } else {
                  console.log('[APIClient] Skipping redirect - letting AuthContext handle it');
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
   * SECURITY: Token is in httpOnly cookie, backend will read it and set new one
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      console.log('[APIClient] Attempting to refresh access token...');
      // Backend reads refreshToken from httpOnly cookie and sets new accessToken cookie
      await this.client.post('/auth/tenant/refresh', {});
      console.log('[APIClient] Token refresh successful');
      return 'cookie-auth'; // Placeholder since token is in cookie
    } catch (error: any) {
      console.error('[APIClient] Token refresh failed:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      });
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
