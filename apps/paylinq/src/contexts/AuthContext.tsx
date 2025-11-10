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
   */
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      console.log('[AuthContext] === STARTING AUTH CHECK ===');
      console.log('[AuthContext] isMounted:', isMounted);
      
      try {
        console.log('[AuthContext] Calling api.auth.getMe()...');
        
        // Call /auth/tenant/me - cookies are sent automatically
        const response = await api.auth.getMe();
        
        console.log('[AuthContext] getMe() returned successfully');
        
        if (!isMounted) {
          console.log('[AuthContext] Component unmounted, skipping state update');
          return;
        }
        
        // Backend returns { user: {...} }, extract the user object
        const userData = response.user || response;
        
        console.log('[AuthContext] Auth check successful:', {
          email: userData.email,
          enabledProducts: userData.enabledProducts,
          productRoles: userData.productRoles,
        });
        
        setUser(userData);
      } catch (err: any) {
        console.log('[AuthContext] getMe() threw error');
        
        if (!isMounted) {
          console.log('[AuthContext] Component unmounted, skipping state update');
          return;
        }
        
        // Not authenticated, session expired, or network error
        const status = err.response?.status;
        const message = err.message;
        
        console.log('[AuthContext] Auth check failed:', { status, message });
        console.log('[AuthContext] Full error:', err);
        setUser(null);
      } finally {
        if (isMounted) {
          // CRITICAL: Always set loading to false
          console.log('[AuthContext] === AUTH CHECK COMPLETE - Setting isLoading = false ===');
          setIsLoading(false);
        } else {
          console.log('[AuthContext] Component unmounted, not setting isLoading');
        }
      }
    };

    checkAuth();
    
    // Cleanup function
    return () => {
      console.log('[AuthContext] Cleanup: Setting isMounted = false');
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
      console.log('[AuthContext] Logging out...');
      
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
