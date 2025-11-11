import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@recruitiq/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for session expiration
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setSessionMessage('Your session has expired. Please login again.');
      // Don't clear returnTo from URL - we need it for redirect after login
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const result = await login(email, password);
    
    // Check if login was successful (true) or if MFA is required
    if (result === true) {
      // Check if there's a return URL
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        navigate(decodeURIComponent(returnTo));
      } else {
        navigate('/dashboard');
      }
    } else if (typeof result === 'object' && result.mfaRequired) {
      // Handle MFA if needed (implement MFA page later)
      console.log('MFA required - implement MFA flow');
    }
    // If result is false, error state will be updated automatically
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
            NX
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
          Welcome to Nexus
        </h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
          Human Resource Information System
        </p>
        
        {sessionMessage && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
            {sessionMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
