import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state by checking with backend (cookies are sent automatically)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated via cookies
        const userData = await apiService.getMe();
        
        // Verify platform access
        if (userData.user_type === 'platform' && userData.permissions?.includes('portal.view')) {
          setUser(userData);
          // Store user data in localStorage for convenience (non-sensitive)
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (error) {
        // Not authenticated, clear any stale data
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await apiService.login(email, password);
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
    return userData;
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const isAuthenticated = !!user;

  const value = {
    user,
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
