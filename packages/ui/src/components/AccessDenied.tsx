/**
 * AccessDenied Component
 * 
 * Generic access denied page for permission failures
 * Can be customized per app with props
 * 
 * @module @recruitiq/ui
 */

import React from 'react';

export interface AccessDeniedProps {
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back button handler */
  onBack?: () => void;
  /** Show contact admin info */
  showContactAdmin?: boolean;
  /** Missing permission codes (for debugging) */
  missingPermissions?: string[];
}

/**
 * Access Denied Component
 * 
 * Generic permission denied page with customization options
 * 
 * @example
 * ```tsx
 * <AccessDenied 
 *   title="Payroll Access Required"
 *   message="You need payroll approval permissions to access this feature."
 *   missingPermissions={['payroll:run:approve']}
 *   showContactAdmin
 * />
 * ```
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'Access Denied',
  message = 'You do not have permission to access this resource.',
  showBackButton = true,
  onBack,
  showContactAdmin = true,
  missingPermissions = [],
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center max-w-md p-8">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 mb-4">{message}</p>
        
        {showContactAdmin && (
          <p className="text-sm text-slate-500 mb-6">
            Please contact your administrator to request access.
          </p>
        )}

        {missingPermissions.length > 0 && (
          <div className="mb-6 p-4 bg-slate-100 rounded-lg text-left">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Missing Permissions:
            </p>
            <ul className="text-xs text-slate-600 space-y-1">
              {missingPermissions.map((perm) => (
                <li key={perm} className="font-mono">
                  • {perm}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showBackButton && (
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};
