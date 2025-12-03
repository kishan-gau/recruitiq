import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { memo } from 'react';

/**
 * Protected Route Component
 * 
 * Prevents re-authentication checks on every navigation by using React.memo
 * Authentication state is managed by AuthContext (checked once on app load)
 * 
 * This component ONLY redirects if authentication state changes, not on every render
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while initial authentication check is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (only checked once on mount via AuthContext)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Memoize to prevent unnecessary re-renders during navigation
export default memo(ProtectedRoute);

