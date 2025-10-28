import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Security: Check for existing session on mount and validate with server
  useEffect(() => {
    const initializeAuth = async () => {
      const token = api.getToken();
      
      if (token) {
        try {
          // Security: Validate token with server
          const response = await api.getMe();
          setUser(response.user);
        } catch (error) {
          console.error('Session validation failed:', error);
          // Security: Clear invalid session
          api.clearTokens();
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      // Security: Validate input before sending
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log('AuthContext: Calling api.login...');
      // Call API with security features (automatic sanitization, token management)
      const response = await api.login(email, password);
      console.log('AuthContext: Login response received:', response);
      
      // Update user state
      setUser(response.user);
      setIsLoading(false);
      
      console.log('AuthContext: Login successful, returning true');
      return true;
    } catch (err) {
      console.error('AuthContext: Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const loginApplicant = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      // Security: Use same secure login endpoint
      // Backend differentiates based on user role
      const response = await api.login(email, password);
      
      // Security: Validate user is actually an applicant
      if (response.user.role !== 'applicant') {
        throw new Error('Invalid credentials for applicant portal');
      }
      
      setUser(response.user);
      setIsLoading(false);
      
      return true;
    } catch (err) {
      console.error('Applicant login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  const signupApplicant = async (data) => {
    try {
      setIsLoading(true);
      setError(null);

      // Security: Use API register endpoint
      const response = await api.register({
        ...data,
        role: 'applicant', // Force applicant role
      });

      // Update user state (API auto-logs in after registration)
      setUser(response.user);
      setIsLoading(false);
      
      return response.user;
    } catch (err) {
      console.error('Applicant signup failed:', err);
      setError(err.message || 'Signup failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Security: Notify server to invalidate tokens
      await api.logout();
      
      // Clear user state
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      // Security: Clear local state even if server request fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    loginApplicant,
    signupApplicant,
    logout,
    isAuthenticated: !!user,
    isRecruiter: user?.role === 'recruiter' || user?.role === 'owner' || user?.role === 'admin',
    isApplicant: user?.role === 'applicant',
    // Security: Expose organization and permission info
    organizationId: user?.organizationId,
    permissions: user?.permissions || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
