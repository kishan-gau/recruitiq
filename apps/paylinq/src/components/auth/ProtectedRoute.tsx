/**
 * Protected Route Component
 * 
 * Wrapper for routes that require authentication.
 * Redirects to login if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  console.log('[ProtectedRoute]', {
    isLoading,
    isAuthenticated,
    pathname: location.pathname
  });

  // Show nothing while checking authentication
  if (isLoading) {
    console.log('[ProtectedRoute] Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Build return URL including pathname and search params
    const returnTo = encodeURIComponent(location.pathname + location.search);
    const loginUrl = `/login?reason=session_expired&returnTo=${returnTo}`;
    
    console.log('[ProtectedRoute] Redirecting to login with returnTo:', returnTo);
    return <Navigate to={loginUrl} state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] Rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
