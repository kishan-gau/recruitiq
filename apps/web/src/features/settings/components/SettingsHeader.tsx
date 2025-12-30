/**
 * Settings Header Component
 * Standard header with breadcrumbs and actions for settings pages
 */

import { ArrowLeft, Save, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface SettingsHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  backTo?: string;
  actions?: ReactNode;
  isEditing?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export function SettingsHeader({
  title,
  description,
  breadcrumbs,
  backTo,
  actions,
  isEditing,
  isSaving,
  onSave,
  onCancel,
}: SettingsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back Link */}
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-gray-400">/</span>
                )}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 dark:text-white font-medium">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(actions || (isEditing && onSave && onCancel)) && (
          <div className="flex items-center gap-3">
            {isEditing && onSave && onCancel ? (
              <>
                <button
                  onClick={onCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4 inline mr-2" />
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              actions
            )}
          </div>
        )}
      </div>
    </div>
  );
}
