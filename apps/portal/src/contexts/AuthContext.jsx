import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaWarning, setMfaWarning] = useState(null); // Grace period warning

  // Initialize auth state by checking with backend (cookies are sent automatically)
  // SECURITY: Session validation via httpOnly cookies (XSS-proof)
  // No localStorage usage - user data stored only in React state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Validate session via httpOnly cookies (sent automatically by browser)
        const userData = await apiService.getMe();
        
        // CRITICAL: Validate that we got valid user data
        // If no email or id, treat as unauthenticated
        if (!userData || !userData.email || !userData.id) {
          console.log('[AuthContext] Invalid user data received (missing email/id), treating as unauthenticated');
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Backend /api/auth/platform/me already enforces platform auth
        // If we get user data, they're authenticated as platform user
        setUser(userData);
        // REMOVED: localStorage.setItem() - unnecessary security risk
      } catch (error) {
        // Not authenticated, clear state
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      
      // Check if MFA is required
      if (response.mfaRequired) {
        return {
          mfaRequired: true,
          mfaToken: response.mfaToken
        };
      }
      
      const userData = response.user;
      // Tokens are automatically set as HTTP-only cookies by the backend

      // CRITICAL: Validate user data before setting state
      if (!userData || !userData.email || !userData.id) {
        throw new Error('Invalid user data received from server');
      }

      // Backend already enforces platform auth via /api/auth/platform/* endpoints
      // No need to check user_type here - if they authenticated, they're platform users
      
      // Optional: Check for specific permissions if needed for UI features
      // For now, if they can login to platform auth, they can access portal
      
      setUser(userData);
      
      // Store MFA warning if present (grace period)
      if (response.mfaWarning) {
        setMfaWarning(response.mfaWarning);
      }
      
      return userData;
    } catch (err) {
      // Check for MFA enforcement error
      if (err.response?.data?.error === 'MFA_SETUP_REQUIRED') {
        throw new Error('Multi-Factor Authentication is required for your organization. Please contact your administrator.');
      }
      throw err;
    }
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
    setMfaWarning(null);
  };

  const dismissMfaWarning = () => {
    setMfaWarning(null);
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    setUser,
    mfaWarning,
    dismissMfaWarning,
    login,
    logout,
    isAuthenticated,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
