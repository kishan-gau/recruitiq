/**
 * Shared Authentication Context
 * 
 * Migrated from apps/recruitiq - battle-tested SSO authentication
 * Adapted to use @recruitiq/api-client for platform-wide consistency
 * 
 * Features:
 * - JWT token management with secure storage  
 * - Automatic token refresh
 * - MFA support with grace periods
 * - Role-based access control
 * - Session validation
 * 
 * @module @recruitiq/auth
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RecruitIQPlatformAPI } from '@recruitiq/api-client';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  workspaceId?: string;
  permissions?: string[];
  mfaEnabled?: boolean;
  [key: string]: any;
}

export interface MFAResponse {
  mfaRequired: true;
  mfaToken: string;
}

export interface AuthContextValue {
  // State
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  error: string | null;
  mfaWarning: string | null;
  
  // Computed properties
  isAuthenticated: boolean;
  isRecruiter: boolean;
  isApplicant: boolean;
  organizationId: string | undefined;
  permissions: string[];
  
  // Methods
  login: (email: string, password: string) => Promise<boolean | MFAResponse>;
  loginApplicant: (email: string, password: string) => Promise<boolean>;
  signupApplicant: (data: any) => Promise<User>;
  logout: () => Promise<void>;
  dismissMfaWarning: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  apiClient?: RecruitIQPlatformAPI;
}

/**
 * Authentication Provider
 * 
 * Wraps the app and provides authentication state and methods
 * Migrated from RecruitIQ app - proven in production
 * 
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children, apiClient }) => {
  const [api] = useState(() => {
    // Use provided client or create new one with environment-aware baseURL
    if (apiClient) return apiClient;
    
    // Check for Vite environment variable, default to relative path for proxy
    const baseURL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
      || '/api';
    
    return new RecruitIQPlatformAPI({
      baseURL,
      timeout: 30000,
    });
  });
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mfaWarning, setMfaWarning] = useState<string | null>(null);

  // Security: Check for existing session on mount and validate with server
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // With httpOnly cookies, we can't check if token exists client-side
        // Just try to get the user profile - if cookies exist, it will work
        // If no cookies, server returns 401 which is expected and normal
        console.log('[AuthContext] Initializing auth - checking for existing session...');
        const response = await api.auth.getMe();
        console.log('[AuthContext] Session found, user:', response.user);
        setUser(response.user as User);
      } catch (error: any) {
        // 401 means no valid session - this is normal, not an error to display
        if (error.response?.status !== 401) {
          console.error('[AuthContext] Session validation failed:', error);
        } else {
          console.log('[AuthContext] No existing session (401)');
        }
        // No valid session
        setUser(null);
      } finally {
        // ALWAYS set isLoading to false, even if there's an error
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [api]);

  const login = async (email: string, password: string): Promise<boolean | MFAResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      // Security: Validate input before sending
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log('AuthContext: Calling api.auth.login...');
      // Call API with security features (automatic sanitization, token management)
      const response = await api.auth.login({ email, password });
      console.log('AuthContext: Login response received:', response);
      
      // Check if MFA is required
      if ('mfaRequired' in response && response.mfaRequired) {
        console.log('AuthContext: MFA required, returning MFA token');
        setIsLoading(false);
        return {
          mfaRequired: true,
          mfaToken: response.mfaToken || '',
        };
      }
      
      // Normal login (no MFA)
      setUser(response.user as User);
      
      // Store MFA warning if present (grace period)
      if ('mfaWarning' in response && response.mfaWarning) {
        setMfaWarning(response.mfaWarning);
      }
      
      setIsLoading(false);
      
      console.log('AuthContext: Login successful, returning true');
      return true;
    } catch (err: any) {
      console.error('AuthContext: Login failed:', err);
      
      // Check for organization requirement error
      if (err.response?.data?.code === 'ORGANIZATION_REQUIRED' || err.response?.data?.code === 'PLATFORM_ADMIN_RESTRICTED') {
        setError(err.response?.data?.message || err.response?.data?.error || 'Your account type cannot access this application. Please contact your administrator.');
      } 
      // Check for MFA enforcement error
      else if (err.response?.data?.error === 'MFA_SETUP_REQUIRED') {
        setError('Multi-Factor Authentication is required for your organization. Please contact your administrator.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed. Please try again.');
      }
      
      setIsLoading(false);
      return false;
    }
  };

  const loginApplicant = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Security: Use same secure login endpoint
      // Backend differentiates based on user role
      const response = await api.auth.login({ email, password });
      
      // Security: Validate user is actually an applicant
      if (response.user.role !== 'applicant') {
        throw new Error('Invalid credentials for applicant portal');
      }
      
      setUser(response.user as User);
      setIsLoading(false);
      
      return true;
    } catch (err: any) {
      console.error('Applicant login failed:', err);
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  const signupApplicant = async (data: any): Promise<User> => {
    try {
      setIsLoading(true);
      setError(null);

      // Security: Use API register endpoint
      const response = await api.auth.register({
        ...data,
        role: 'applicant', // Force applicant role
      });

      // Update user state (API auto-logs in after registration)
      setUser(response.user as User);
      setIsLoading(false);
      
      return response.user as User;
    } catch (err: any) {
      console.error('Applicant signup failed:', err);
      setError(err.response?.data?.message || err.message || 'Signup failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Security: Notify server to invalidate tokens
      await api.auth.logout();
      
      // Clear user state
      setUser(null);
      setError(null);
      setMfaWarning(null);
    } catch (err) {
      console.error('Logout failed:', err);
      // Security: Clear local state even if server request fails
      setUser(null);
      setMfaWarning(null);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissMfaWarning = () => {
    setMfaWarning(null);
  };

  // Debug: Log the computed values
  const isRecruiterValue = user?.type === 'tenant' && (
    user?.enabledProducts?.includes?.('recruitiq') || 
    user?.productRoles?.recruitiq
  );
  
  console.log('[AuthContext] Computing context value:', {
    hasUser: !!user,
    userType: user?.type,
    enabledProducts: user?.enabledProducts,
    productRoles: user?.productRoles,
    isAuthenticated: !!user,
    isRecruiter: isRecruiterValue,
  });

  const value: AuthContextValue = {
    user,
    setUser,
    isLoading,
    error,
    mfaWarning,
    dismissMfaWarning,
    login,
    loginApplicant,
    signupApplicant,
    logout,
    isAuthenticated: !!user,
    // For multi-product platform: Check if user has access to the current product
    // RecruitIQ: Check if 'recruitiq' is in enabledProducts OR if they have a recruitiq role
    isRecruiter: isRecruiterValue,
    isApplicant: user?.role === 'applicant',
    // Security: Expose organization and permission info
    organizationId: user?.organizationId,
    permissions: user?.permissions || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access authentication context
 * 
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAuth();
 * ```
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
