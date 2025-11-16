/**
 * Authentication Service for Nexus HRIS
 * Handles tenant user authentication via /api/auth-v2/tenant/*
 */

import axios from 'axios';

// SECURITY: Configure axios to send httpOnly cookies with requests
const api = axios.create({
  withCredentials: true, // CRITICAL: Send cookies with all requests
});

interface LoginCredentials {
  email: string;
  password: string;
  organizationId: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    organizationId: string;
    organizationName: string;
    employeeId?: string;
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
    enabledProducts: string[];
    productRoles: Record<string, string>;
    type: 'tenant';
  };
  // SECURITY: Tokens are now in httpOnly cookies, not returned in response
}

interface UserProfile {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  enabledProducts: string[];
  productRoles: Record<string, string>;
  preferences?: Record<string, unknown>;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  type: 'tenant';
}

class AuthService {
  private baseURL = '/api/auth/tenant';

  /**
   * Login tenant user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await api.post(`${this.baseURL}/login`, credentials);
      
      const { user } = response.data;
      
      // SECURITY: Tokens are now in httpOnly cookies set by backend
      // User data should be stored in React state by the calling component
      // Do NOT store in localStorage to prevent XSS attacks
      
      return { user };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Login failed');
    }
  }

  /**
   * Logout tenant user
   */
  async logout(): Promise<void> {
    try {
      // Backend will read refreshToken from httpOnly cookie and clear cookies
      await api.post(`${this.baseURL}/logout`, {});
      // Calling component should clear user state
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<void> {
    try {
      // SECURITY: Backend will read refreshToken from httpOnly cookie
      await api.post(`${this.baseURL}/refresh`, {});
      // New access token is set as httpOnly cookie by backend
    } catch (error: any) {
      // Refresh failed - calling component should handle auth state clearing
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      // SECURITY: Auth token is in httpOnly cookie, sent automatically
      const response = await api.get(`${this.baseURL}/me`);
      
      const user = response.data.user;
      // Calling component should store user in state
      
      return user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch profile');
    }
  }

  /**
   * Switch product context
   */
  async switchProduct(product: string): Promise<{ product: string; role: string }> {
    try {
      // SECURITY: Auth token is in httpOnly cookie, sent automatically
      const response = await api.post(
        `${this.baseURL}/switch-product`, 
        { product }
      );
      
      const { product: currentProduct, role } = response.data;
      
      // New access token with product context is set as httpOnly cookie by backend
      // Calling component should store current product in state
      
      return { product: currentProduct, role };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to switch product');
    }
  }

  /**
   * Revoke all sessions (logout from all devices)
   */
  async revokeAllSessions(): Promise<void> {
    try {
      // SECURITY: Auth token is in httpOnly cookie, sent automatically
      await api.post(`${this.baseURL}/revoke-all-sessions`, {});
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to revoke sessions');
    }
  }

  /**
   * Check if user has access to product
   * @param user - Current user object from component state
   * @param product - Product identifier
   */
  hasProductAccess(user: LoginResponse['user'] | null, product: string): boolean {
    return user?.enabledProducts?.includes(product) || false;
  }

  /**
   * Get user's role in product
   * @param user - Current user object from component state
   * @param product - Product identifier
   */
  getProductRole(user: LoginResponse['user'] | null, product: string): string | null {
    return user?.productRoles?.[product] || null;
  }
}

export const authService = new AuthService();
export default authService;
