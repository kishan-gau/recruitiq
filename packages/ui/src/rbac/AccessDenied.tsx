/**
 * AccessDenied Page Component
 * 
 * Generic access denied UI page for when user lacks permissions
 * Can be used as fallback in RBAC components or standalone route
 * 
 * @module @recruitiq/ui/rbac
 */

import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export interface AccessDeniedProps {
  /** Custom title message */
  title?: string;
  /** Custom description message */
  description?: string;
  /** Show back button to navigate to previous page */
  showBackButton?: boolean;
  /** Custom action button label */
  actionLabel?: string;
  /** Callback when action button is clicked (required if showBackButton is true) */
  onAction?: () => void;
}

/**
 * Access denied page component
 * Displays when user lacks required permissions
 * 
 * @example
 * ```tsx
 * // As standalone page
 * <AccessDenied title="Access Denied" />
 * 
 * // As fallback in PermissionGate
 * <PermissionGate permission="admin:access" fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * // With custom action
 * <AccessDenied 
 *   title="Access Denied" 
 *   onAction={() => window.history.back()} 
 * />
 * ```
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'Access Denied',
  description = 'You do not have permission to access this resource.',
  showBackButton = true,
  actionLabel = 'Go Back',
  onAction,
}) => {
  const handleBackClick = () => {
    if (onAction) {
      onAction();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {description}
        </p>

        {showBackButton && (
          <button
            onClick={handleBackClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
