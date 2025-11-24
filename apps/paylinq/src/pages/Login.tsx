import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';
import { DollarSign } from 'lucide-react';

export default function Login() {
  console.log('[Login] Component rendering');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { login, error: authError, isLoading: authLoading, isAuthenticated } = useAuth();
  
  console.log('[Login] Auth state:', { authError, authLoading, isAuthenticated });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('[Login] User already authenticated, redirecting...');
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        const decodedUrl = decodeURIComponent(returnTo);
        console.log('[Login] Redirecting to returnTo:', decodedUrl);
        navigate(decodedUrl, { replace: true });
      } else {
        console.log('[Login] Redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, navigate, searchParams]);

  // Check for session expiration
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setSessionMessage('Your session has expired. Please login again.');
      // Don't clear returnTo from URL - we need it for redirect after login
    }
  }, [searchParams]);

  // Update error from auth context
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return 'Password is required';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const firstErrorRef = emailValidationError ? emailRef : passwordRef;
      firstErrorRef.current?.focus();
      return;
    }

    try {
      console.log('Attempting login with:', email);
      const result = await login(email, password);
      
      // Check if MFA is required
      if (typeof result === 'object' && result.mfaRequired) {
        // TODO: Implement MFA verification step
        console.log('MFA required - implement MFA verification');
        setError('MFA verification required. Please implement MFA flow.');
        return;
      }
      
      // Normal login success
      if (result === true) {
        console.log('Login successful');
        
        // Check if there's a return URL (user was redirected here after session expiry)
        const returnTo = searchParams.get('returnTo');
        console.log('[Login] returnTo parameter:', returnTo);
        
        if (returnTo) {
          const decodedUrl = decodeURIComponent(returnTo);
          console.log('[Login] Redirecting back to:', decodedUrl);
          // Use window.location for hard redirect to ensure navigation works
          window.location.href = decodedUrl;
        } else {
          console.log('[Login] No returnTo, navigating to dashboard');
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      handleApiError(err, {
        toast,
        defaultMessage: 'Invalid credentials. Please try again.',
      });
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Gradient with Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 to-teal-600 p-12 flex-col justify-between text-white">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <DollarSign className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Paylinq
          </h1>
          <p className="text-2xl text-emerald-50 mb-8">
            Surinamese Payroll Management
          </p>
          <p className="text-lg text-emerald-100 max-w-md">
            Streamline your payroll process with our powerful platform. 
            Manage employees, process payments, and handle Surinamese tax compliance efficiently.
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-center items-end gap-4">
          <div className="w-20 h-20 rounded-full bg-emerald-400 border-4 border-white shadow-lg"></div>
          <div className="w-24 h-24 rounded-full bg-white border-4 border-emerald-400 shadow-lg"></div>
          <div className="w-20 h-20 rounded-full bg-emerald-400 border-4 border-white shadow-lg"></div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Paylinq</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Payroll Management</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Secure sign-in
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Access your payroll dashboard
            </p>
          </div>

          {/* Session Expiration Warning */}
          {sessionMessage && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {sessionMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all ${
                  emailError 
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {emailError && (
                <div id="email-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {emailError}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className={`w-full px-4 py-3 pr-12 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all ${
                    passwordError 
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                <div id="password-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {passwordError}
                </div>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {authLoading ? (
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

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium mb-1">
              RecruitIQ SSO
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Use your RecruitIQ credentials to sign in to Paylinq. Single sign-on enabled across all platform apps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
