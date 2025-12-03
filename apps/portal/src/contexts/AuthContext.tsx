/**
 * Portal Authentication Context
 * 
 * Industry-standard authentication using:
 * - httpOnly cookies (XSS-proof)
 * - CSRF protection
 * - Multi-Factor Authentication (MFA)
 * - Centralized @recruitiq/api-client
 * 
 * SECURITY:
 * - Session tokens stored in httpOnly cookies (not accessible to JavaScript)
 * - No localStorage usage (prevents XSS token theft)
 * - User data stored only in React state (cleared on tab close)
 * - CSRF tokens for all state-changing operations
 * 
 * @see FRONTEND_STANDARDS.md - "API Client Integration Standards"
 * @see SECURITY_STANDARDS.md - "Authentication & Authorization"
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type {
  User,
  MFAWarning,
  LoginResponse,
  AuthContextValue,
} from '../types/auth.types';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mfaWarning, setMfaWarning] = useState<MFAWarning | null>(null);

  /**
   * Initialize auth state by checking with backend
   * 
   * SECURITY: Session validation via httpOnly cookies (XSS-proof)
   * Cookies are sent automatically by browser - no manual token handling
   * No localStorage usage - user data stored only in React state
   * 
   * CRITICAL: This effect runs ONCE on mount, not on every navigation
   * The empty dependency array [] ensures authentication check happens only at app startup
   */
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

    const checkAuth = async () => {
      try {
        // Validate session via httpOnly cookies (sent automatically)
        const userData = await authService.getMe();

        // CRITICAL: Validate that we got valid user data
        // If no email or id, treat as unauthenticated
        if (!userData || !userData.email || !userData.id) {
          console.log(
            '[AuthContext] Invalid user data received (missing email/id), treating as unauthenticated'
          );
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Backend /api/auth/platform/me already enforces platform auth
        // If we get user data, they're authenticated as platform user
        if (isMounted) {
          setUser(userData);
        }
      } catch (error) {
        // Not authenticated or session expired
        console.log('[AuthContext] Session validation failed:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - run ONCE on mount only

  /**
   * Login with email and password
   * 
   * Returns:
   * - User object if login successful
   * - LoginResponse with mfaRequired if MFA needed
   * 
   * @throws {AuthenticationError} If credentials invalid
   * @throws {Error} If MFA setup required but not configured
   */
  const login = async (email: string, password: string): Promise<LoginResponse | User> => {
    try {
      const response = await authService.login(email, password);

      // Check if MFA is required
      if (response.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          mfaToken: response.mfaToken,
        };
      }

      const userData = response.user;

      // CRITICAL: Validate user data before setting state
      if (!userData || !userData.email || !userData.id) {
        throw new Error('Invalid user data received from server');
      }

      // Backend already enforces platform auth via /api/auth/platform/* endpoints
      // No need to check user_type here - if they authenticated, they're platform users

      setUser(userData);

      // Store MFA warning if present (grace period)
      if (response.mfaWarning) {
        setMfaWarning(response.mfaWarning);
      }

      return userData;
    } catch (err: any) {
      // Check for MFA enforcement error
      if (err.response?.data?.error === 'MFA_SETUP_REQUIRED') {
        throw new Error(
          'Multi-Factor Authentication is required for your organization. Please contact your administrator.'
        );
      }

      // Re-throw for component error handling
      throw err;
    }
  };

  /**
   * Logout and clear session
   * 
   * SECURITY:
   * - Backend clears httpOnly cookies
   * - Frontend clears React state
   * - No localStorage cleanup needed (we don't use it)
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Continue with local cleanup even if backend call fails
    } finally {
      setUser(null);
      setMfaWarning(null);
    }
  };

  /**
   * Dismiss MFA warning during grace period
   */
  const dismissMfaWarning = (): void => {
    setMfaWarning(null);
  };

  const isAuthenticated = !!user;

  const value: AuthContextValue = {
    user,
    setUser,
    mfaWarning,
    dismissMfaWarning,
    login,
    logout,
    isAuthenticated,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * 
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
