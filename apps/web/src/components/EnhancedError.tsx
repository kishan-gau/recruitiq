/**
 * Enhanced Error Alert Component
 * 
 * Displays detailed error messages with specific reasons and actionable guidance
 * Follows the UX improvement recommendations for better error feedback
 */

import { AlertCircle, Info, XCircle } from 'lucide-react';

export interface ErrorDetail {
  employeeId?: string;
  employeeName?: string;
  field?: string;
  reason: string;
  suggestion?: string;
}

export interface EnhancedErrorProps {
  title: string;
  message?: string;
  details?: ErrorDetail[];
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onClose?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export default function EnhancedError({
  title,
  message,
  details = [],
  actions = [],
  onClose,
  type = 'error',
}: EnhancedErrorProps) {
  const styles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      message: 'text-red-800',
      detail: 'text-red-700',
      IconComponent: XCircle,
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      message: 'text-yellow-800',
      detail: 'text-yellow-700',
      IconComponent: AlertCircle,
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-800',
      detail: 'text-blue-700',
      IconComponent: Info,
    },
  };

  const style = styles[type];
  const Icon = style.IconComponent;

  return (
    <div className={`rounded-lg border p-4 ${style.container}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${style.icon}`} />
        </div>
        <div className="ml-3 flex-1">
          {/* Title */}
          <h3 className={`text-sm font-semibold ${style.title}`}>{title}</h3>

          {/* Message */}
          {message && <p className={`mt-2 text-sm ${style.message}`}>{message}</p>}

          {/* Details */}
          {details.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className={`text-sm font-medium ${style.detail}`}>
                {type === 'error' && 'Actie vereist:'}
                {type === 'warning' && 'Let op:'}
                {type === 'info' && 'Details:'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className={`text-sm ${style.detail}`}>
                    {detail.employeeName && (
                      <span className="font-medium">{detail.employeeName}</span>
                    )}
                    {detail.employeeId && !detail.employeeName && (
                      <span className="font-medium">Medewerker {detail.employeeId}</span>
                    )}
                    {(detail.employeeName || detail.employeeId) && ' - '}
                    <span>{detail.reason}</span>
                    {detail.suggestion && (
                      <div className="ml-5 mt-1 text-xs italic">
                        Suggestie: {detail.suggestion}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="mt-4 flex gap-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md
                    ${
                      action.variant === 'primary'
                        ? type === 'error'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : type === 'warning'
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        : type === 'error'
                        ? 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
                        : type === 'warning'
                        ? 'bg-white text-yellow-700 border border-yellow-300 hover:bg-yellow-50'
                        : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={onClose}
              className={`
                inline-flex rounded-md p-1.5
                ${
                  type === 'error'
                    ? 'text-red-500 hover:bg-red-100'
                    : type === 'warning'
                    ? 'text-yellow-500 hover:bg-yellow-100'
                    : 'text-blue-500 hover:bg-blue-100'
                }
              `}
            >
              <span className="sr-only">Sluiten</span>
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper function to parse error response and create enhanced error props
 */
export function parseApiError(error: any): Partial<EnhancedErrorProps> {
  // Check if error has structured details
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    return {
      title: error.response.data.message || 'Er is een fout opgetreden',
      details: error.response.data.errors.map((err: any) => ({
        employeeId: err.employeeId,
        employeeName: err.employeeName,
        field: err.field,
        reason: err.error || err.message || err.reason,
        suggestion: err.suggestion,
      })),
    };
  }

  // Check if error has warnings
  if (error.response?.data?.warnings && Array.isArray(error.response.data.warnings)) {
    return {
      title: 'Waarschuwing',
      type: 'warning',
      details: error.response.data.warnings.map((warn: any) => ({
        employeeId: warn.employeeId,
        employeeName: warn.employeeName,
        reason: warn.warning || warn.message,
      })),
    };
  }

  // Generic error
  return {
    title: 'Fout',
    message: error.response?.data?.message || error.message || 'Er is een onverwachte fout opgetreden',
  };
}
