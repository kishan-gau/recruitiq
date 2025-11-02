import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import MFAVerification from '../components/MFAVerification';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { login: authLogin, isAuthenticated, setUser } = useAuth();
  
  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaToken, setMfaToken] = useState('');

  // Check if user is already authenticated (SSO via cookies)
  useEffect(() => {
    // If AuthContext shows user is authenticated, redirect immediately
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    const checkExistingAuth = async () => {
      try {
        // Try to get current user using cookie-based auth
        // Cookies are automatically sent with the request
        const response = await axios.get('/api/auth/me');
        const user = response.data.user;
        
        // Check if user has platform access
        if (user.user_type === 'platform' && user.permissions?.includes('portal.view')) {
          // User is authenticated via SSO and has access, redirect to dashboard
          navigate('/dashboard', { replace: true });
          return;
        } else {
          // User doesn't have platform access, clear any stale data
          localStorage.removeItem('user');
        }
      } catch (err) {
        // Not authenticated or token expired, show login form
        // Clear any stale localStorage data
        localStorage.removeItem('user');
      }
      
      setChecking(false);
    };
    
    checkExistingAuth();
  }, [navigate, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use AuthContext login method which handles state management
      const result = await authLogin(email, password);
      
      // Check if MFA is required
      if (result && result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setShowMFA(true);
        setLoading(false);
        return;
      }
      
      // Navigation will happen via the useEffect above when isAuthenticated becomes true
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.message || 
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Login failed. Please check your credentials.'
      );
      setLoading(false);
    }
  };

  const handleMFASuccess = async (code, isBackupCode) => {
    try {
      // Call appropriate API based on code type
      const response = isBackupCode 
        ? await api.useBackupCode(mfaToken, code)
        : await api.verifyMFA(mfaToken, code);
      
      // Store user data
      const userData = response.data.user;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Error will be caught by MFAVerification component
      throw err;
    }
  };

  const handleMFACancel = () => {
    setShowMFA(false);
    setMfaToken('');
    setPassword('');
  };

  // Show MFA verification if required
  if (showMFA) {
    return (
      <MFAVerification 
        mfaToken={mfaToken}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />
    );
  }

  // Show loading while checking existing authentication
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-700">Checking authentication...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RecruitIQ Platform
          </h1>
          <p className="text-gray-600">
            Platform Administration Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="platform_admin@recruitiq.com"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Test Credentials Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Test Credentials (Development Only)
          </p>
          <p className="text-xs text-gray-400 text-center mt-1 font-mono">
            platform_admin@recruitiq.com / Admin123!
          </p>
        </div>
      </div>
    </div>
  );
}
