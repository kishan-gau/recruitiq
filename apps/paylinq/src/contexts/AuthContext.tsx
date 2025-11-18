import { createContext, useState, useEffect, ReactNode } from 'react';
import api from '@/hooks/usePaylinqAPI';

/**
 * User data returned from authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  type: 'tenant' | 'platform';
  organizationId: string;
  organizationName?: string;
  employeeId?: string;
  enabledProducts?: string[];
  productRoles?: Record<string, string>;
  preferences?: any;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
}

/**
 * Authentication context value
 */
export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean | { mfaRequired: boolean }>;
  logout: () => Promise<void>;
  error: string | null;
}

/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Uses httpOnly cookies for secure token storage.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider
 * 
 * Initializes authentication state ONCE on mount by checking the session.
 * Manages login, logout, and user state.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  console.log('[AuthProvider] Component rendering...');
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check authentication status on initial mount
   * This runs ONCE when the app loads
   * 
   * OPTIMIZATION: Only fetch CSRF token if we don't already have one.
   * The token persists in memory across page refreshes isn't needed.
   * We only need to validate the session cookie.
   */
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      console.log('[AuthContext] === STARTING AUTH CHECK ===');
      
      try {
        console.log('[AuthContext] Validating session...');
        
        // Call /auth/tenant/me - cookies are sent automatically
        // This single call validates the session and returns user data
        const response = await api.auth.getMe();
        
        if (!isMounted) return;
        
        // Backend returns { user: {...} }, extract the user object
        const userData = response.user || response;
        
        // CRITICAL: Validate that we got valid user data
        // If no email or id, treat as unauthenticated
        if (!userData || !userData.email || !userData.id) {
          console.log('[AuthContext] Invalid user data received (missing email/id), treating as unauthenticated');
          setUser(null);
          return;
        }
        
        console.log('[AuthContext] Session valid:', userData.email);
        setUser(userData);
        
        // Fetch CSRF token after successful session validation
        // This ensures protected routes have CSRF token for mutations
        try {
          const csrfToken = await api.fetchCsrfToken();
          console.log('[AuthContext] CSRF token fetched for existing session:', csrfToken ? 'YES' : 'NO');
          if (!csrfToken) {
            console.warn('[AuthContext] CSRF token fetch returned null - mutations may fail');
          }
        } catch (csrfErr: any) {
          console.error('[AuthContext] Failed to fetch CSRF token:', csrfErr.response?.status, csrfErr.message);
          // Non-fatal - will be fetched automatically on first mutation if needed
        }
        
      } catch (err: any) {
        if (!isMounted) return;
        
        // Session invalid or expired - this is expected behavior
        // Don't log as error since unauthenticated state is normal
        const status = err.response?.status;
        
        if (status === 401) {
          // Expected: user is not logged in or session expired
          console.log('[AuthContext] No active session (unauthenticated)');
        } else {
          // Unexpected error - could be network issue or server error
          console.warn('[AuthContext] Session check failed:', status, err.message);
        }
        
        setUser(null);
        
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log('[AuthContext] === AUTH CHECK COMPLETE ===');
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - runs ONCE on mount

  /**
   * Login with email and password
   * Backend sets httpOnly cookies on successful login
   */
  const login = async (email: string, password: string): Promise<boolean | { mfaRequired: boolean }> => {
    setError(null);
    setIsLoading(true);

    try {
      console.log('[AuthContext] Attempting login...');
      
      // Call tenant login endpoint
      const response = await api.auth.login({ email, password });

      // Check if MFA is required
      if ('mfaRequired' in response && response.mfaRequired) {
        setIsLoading(false);
        return { mfaRequired: true };
      }

      // Normal login success
      // Backend returns { user: {...} }, extract the user object
      const userData = response.user || response;
      
      console.log('[AuthContext] Login successful:', {
        email: userData.email,
        enabledProducts: userData.enabledProducts,
        productRoles: userData.productRoles,
      });

      setUser(userData);
      
      // Fetch CSRF token after successful login
      // This ensures we have a fresh token for subsequent mutations
      try {
        const csrfToken = await api.fetchCsrfToken();
        console.log('[AuthContext] CSRF token fetched after login:', csrfToken ? 'YES' : 'NO');
        if (!csrfToken) {
          console.error('[AuthContext] CRITICAL: CSRF token fetch returned null after login - mutations will fail!');
        }
      } catch (csrfError: any) {
        console.error('[AuthContext] CRITICAL: Failed to fetch CSRF token after login:', csrfError.response?.status, csrfError.message);
        // Non-fatal - will be fetched on first mutation if needed
      }
      
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('[AuthContext] Login failed:', err.response?.data || err.message);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Logout
   * Calls backend to clear httpOnly cookies
   */
  const logout = async (): Promise<void> => {
    try {
      console.log('[AuthContext] ============================================');
      console.log('[AuthContext] LOGOUT CALLED');
      console.log('[AuthContext] Stack trace:', new Error().stack);
      console.log('[AuthContext] ============================================');
      
      // Call logout endpoint to clear cookies
      await api.auth.logout();
      
      console.log('[AuthContext] Logout successful');
      setUser(null);
    } catch (err: any) {
      console.error('[AuthContext] Logout error:', err);
      // Clear user state even if logout call fails
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error,
  };

  console.log('[AuthProvider] Rendering with state:', { 
    isLoading, 
    isAuthenticated: !!user, 
    userEmail: user?.email 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
