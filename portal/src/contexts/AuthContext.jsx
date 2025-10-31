import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state by checking with backend (cookies are sent automatically)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated via cookies
        const response = await axios.get('/api/auth/me');
        const userData = response.data.user;
        
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

  // Configure axios to send cookies with all requests (for cookie-based auth)
  useEffect(() => {
    // Enable sending cookies with all requests (for SSO)
    axios.defaults.withCredentials = true;

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Don't retry for login, refresh, or logout endpoints
        const skipRefreshUrls = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];
        const shouldSkipRefresh = skipRefreshUrls.some(url => originalRequest.url?.includes(url));

        // If 401 and not already retrying, try to refresh token via cookies
        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
          originalRequest._retry = true;

          try {
            // Refresh token is sent automatically via cookies
            await axios.post('/api/auth/refresh', {});

            // Retry original request (new token is now in cookies)
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', {
      email,
      password
    });

    const { user: userData } = response.data;
    // Tokens are automatically set as HTTP-only cookies by the backend

    // Verify user is a platform user with portal.view permission
    if (userData.user_type !== 'platform') {
      throw new Error('Access denied. This portal is for platform administrators only.');
    }

    if (!userData.permissions || !userData.permissions.includes('portal.view')) {
      throw new Error('Access denied. You do not have permission to access this portal.');
    }

    // Store user data in localStorage for convenience (non-sensitive)
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  };

  const logout = async () => {
    // Call backend logout endpoint
    // Tokens are automatically sent via cookies and cleared by backend
    try {
      await axios.post('/api/auth/logout', {});
    } catch (err) {
      // Ignore logout errors - user is logged out locally anyway
      console.log('Logout endpoint failed, but continuing with local logout');
    }

    // Clear user data from localStorage (cookies are cleared by backend)
    localStorage.removeItem('user');
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
