import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import MFAVerification from '../components/MFAVerification';
import apiClient from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, setUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  
  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaToken, setMfaToken] = useState('');

  // Check for session expiration or forced logout
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setSessionMessage('Your session has expired or was ended from another device. Please login again.');
      // Clear the URL parameter
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const validateEmail = (value) => {
    if (!value.trim()) {
      return 'Email is required';
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (value) => {
    if (!value) {
      return 'Password is required';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setEmailError(validateEmail(value));
    }
    setError('');
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setEmailError(validateEmail(email));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      setPasswordError(validatePassword(value));
    }
    setError('');
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setPasswordError(validatePassword(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Mark all as touched
    setTouched({ email: true, password: true });
    
    // Validate all fields
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);
    
    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);
    
    if (emailValidationError || passwordValidationError) {
      // Scroll to first error with animation
      const firstErrorRef = emailValidationError ? emailRef : passwordRef;
      if (firstErrorRef.current) {
        firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorRef.current.classList.add('animate-shake');
        setTimeout(() => {
          firstErrorRef.current?.classList.remove('animate-shake');
          firstErrorRef.current?.focus();
        }, 400);
      }
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Attempting login with:', email);
      const result = await login(email, password);
      console.log('Login result:', result);
      
      // Check if MFA is required
      if (result && result.mfaRequired) {
        console.log('MFA required, showing verification step');
        setMfaToken(result.mfaToken);
        setShowMFA(true);
        setIsLoading(false);
        return;
      }
      
      // Normal login success (no MFA)
      if (result) {
        console.log('Login successful, navigating to /');
        navigate('/');
      } else {
        console.log('Login failed');
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFASuccess = async (code, isBackupCode) => {
    try {
      // Call appropriate API based on code type
      const response = isBackupCode 
        ? await apiClient.useBackupCode(mfaToken, code)
        : await apiClient.verifyMFA(mfaToken, code);
      
      // Store tokens and set user
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      setUser(response.data.user);
      
      // Navigate to app
      navigate('/');
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

  const handleGoogleSignIn = () => {
    // Simulate Google sign-in
    setError('');
    login('demo@example.com', 'demo').then(() => navigate('/'));
  };

  const handleMicrosoftSignIn = () => {
    // Simulate Microsoft sign-in
    setError('');
    login('demo@microsoft.com', 'demo').then(() => navigate('/'));
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

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Teal with Illustration */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-500 to-teal-600 p-12 flex-col justify-between text-white"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-teal-600">RI</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            RecruitIQ
          </h1>
          <p className="text-2xl text-teal-50 mb-8">
            Applicant Tracking System
          </p>
          <p className="text-lg text-teal-100 max-w-md">
            Streamline your recruitment process with our powerful ATS. 
            Manage candidates, track applications, and hire the best talent efficiently.
          </p>
        </div>

        {/* Illustration Area */}
        <div className="flex justify-center items-end gap-4">
          {/* Simple avatar illustrations using CSS */}
          <div className="w-20 h-20 rounded-full bg-teal-400 border-4 border-white shadow-lg flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="w-24 h-24 rounded-full bg-white border-4 border-teal-400 shadow-lg flex items-center justify-center">
            <svg className="w-12 h-12 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="w-20 h-20 rounded-full bg-teal-400 border-4 border-white shadow-lg flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 bg-white dark:bg-slate-900 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">RI</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">RecruitIQ</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Applicant Tracking System</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Secure sign-in
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Your data is protected
            </p>
          </div>

          {/* Session Expiration Warning */}
          {sessionMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2"
            >
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {sessionMessage}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                aria-required="true"
                aria-invalid={emailError ? 'true' : 'false'}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  emailError 
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-slate-300 dark:border-slate-600 focus:ring-teal-500 focus:border-teal-500'
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {emailError && (
                <div id="email-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
                  {emailError}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  aria-required="true"
                  aria-invalid={passwordError ? 'true' : 'false'}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                    passwordError 
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 dark:border-slate-600 focus:ring-teal-500 focus:border-teal-500'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <div id="password-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
                  {passwordError}
                </div>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-slate-300 dark:border-slate-700"></div>
            <span className="text-sm text-slate-500 dark:text-slate-400">or</span>
            <div className="flex-1 border-t border-slate-300 dark:border-slate-700"></div>
          </div>

          {/* Social Sign In */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              className="w-full py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Sign in with Microsoft
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-teal-600 dark:text-teal-400 hover:underline"
            >
              Forgot password?
            </button>
            <div className="text-slate-500 dark:text-slate-400">
              English
            </div>
          </div>

          {/* Demo Info */}
          <div className="mt-8 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
            <p className="text-sm text-teal-800 dark:text-teal-300 font-medium mb-1">
              Demo Mode
            </p>
            <p className="text-xs text-teal-600 dark:text-teal-400">
              Enter any email and password to sign in, or use the Google/Microsoft buttons for quick access.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
