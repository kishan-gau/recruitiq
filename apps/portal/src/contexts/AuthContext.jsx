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
        
        // Verify platform access
        if (userData.user_type === 'platform' && userData.permissions?.includes('portal.view')) {
          setUser(userData);
          // REMOVED: localStorage.setItem() - unnecessary security risk
        }
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

      // Verify user is a platform user with portal.view permission
      if (userData.user_type !== 'platform') {
        throw new Error('Access denied. This portal is for platform administrators only.');
      }

      if (!userData.permissions || !userData.permissions.includes('portal.view')) {
        throw new Error('Access denied. You do not have permission to access this portal.');
      }

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
