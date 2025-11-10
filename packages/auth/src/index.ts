/**
 * @recruitiq/auth
 * 
 * Shared authentication and authorization module for RecruitIQ platform
 * Provides React context, hooks, and components for SSO across all apps
 */

export { AuthProvider, useAuth } from './AuthContext';
export type { User, AuthContextValue, MFAResponse, AuthProviderProps } from './AuthContext';

export { ProtectedRoute } from './ProtectedRoute';
export type { ProtectedRouteProps } from './ProtectedRoute';
