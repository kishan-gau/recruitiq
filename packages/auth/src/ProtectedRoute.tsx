/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireRole?: string | string[];
  requirePermission?: string | string[];
  requireProduct?: string; // Product slug (e.g., 'nexus', 'paylinq', 'recruitiq')
}

/**
 * Protected Route Component
 * 
 * @example
 * ```tsx
 * <ProtectedRoute requireRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute requireProduct="nexus">
 *   <NexusApp />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requireRole,
  requirePermission,
  requireProduct,
}) => {
  const { isAuthenticated, isLoading, user, permissions } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  // But avoid infinite loops - don't redirect if already on login page
  if (!isAuthenticated) {
    // Prevent redirect loop if we're already at the redirect destination
    if (location.pathname === redirectTo) {
      console.warn('[ProtectedRoute] Already at redirect destination, preventing loop');
      return null;
    }
    
    // Redirect to login, preserving the intended destination
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check product access requirements
  if (requireProduct && user) {
    const hasProductAccess = user.enabledProducts?.includes(requireProduct);
    if (!hasProductAccess) {
      // User is authenticated but doesn't have access to this product
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center max-w-md p-8">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-4">
              You don't have access to this product. Please contact your administrator to request access.
            </p>
            <p className="text-sm text-slate-500">
              Required product: <span className="font-mono font-semibold">{requireProduct}</span>
            </p>
          </div>
        </div>
      );
    }
  }

  // Check role requirements
  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (user && !roles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission requirements
  if (requirePermission) {
    const requiredPermissions = Array.isArray(requirePermission) ? requirePermission : [requirePermission];
    const hasPermission = requiredPermissions.every(perm => permissions.includes(perm));
    
    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
