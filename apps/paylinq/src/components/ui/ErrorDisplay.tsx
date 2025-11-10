/**
 * Error Display Components
 * 
 * Reusable error components for different scenarios:
 * - ErrorAlert: Inline error message
 * - ErrorPage: Full-page error display
 * - ErrorBoundaryFallback: Fallback UI for error boundaries
 */

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

// Inline error alert
export const ErrorAlert = ({
  title = 'Error',
  message,
  onRetry,
  className = '',
}: ErrorAlertProps) => (
  <div className={`rounded-md bg-red-50 p-4 ${className}`}>
    <div className="flex">
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">{title}</h3>
        <div className="mt-2 text-sm text-red-700">
          <p>{message}</p>
        </div>
        {onRetry && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

interface ErrorPageProps {
  title?: string;
  message?: string;
  statusCode?: number;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

// Full-page error display
export const ErrorPage = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again later.',
  statusCode,
  onRetry,
  showHomeButton = true,
}: ErrorPageProps) => (
  <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
    <div className="text-center max-w-md">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-red-100 p-6">
          <AlertCircle className="h-16 w-16 text-red-600" />
        </div>
      </div>

      {/* Status code */}
      {statusCode && (
        <p className="text-6xl font-bold text-gray-900 mb-4">{statusCode}</p>
      )}

      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h1>

      {/* Message */}
      <p className="text-gray-600 mb-8">{message}</p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </button>
        )}

        {showHomeButton && (
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Home className="h-5 w-5 mr-2" />
            Go Home
          </Link>
        )}
      </div>
    </div>
  </div>
);

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// Error boundary fallback UI
export const ErrorBoundaryFallback = ({
  error,
  resetErrorBoundary,
}: ErrorBoundaryFallbackProps) => (
  <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
    <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Application Error
          </h2>
          <p className="text-gray-600 mb-4">
            An unexpected error occurred in the application. This has been logged and
            our team will investigate.
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Error Details:</p>
              <pre className="text-xs text-red-600 overflow-x-auto">
                {error.message}
              </pre>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                    Stack trace
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={resetErrorBoundary}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>

            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Network error (no connection)
export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <ErrorAlert
    title="Network Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    onRetry={onRetry}
  />
);

// Not found error (404)
export const NotFoundError = () => (
  <ErrorPage
    title="Page Not Found"
    message="The page you're looking for doesn't exist or has been moved."
    statusCode={404}
    showHomeButton
  />
);

// Unauthorized error (401)
export const UnauthorizedError = () => (
  <ErrorPage
    title="Unauthorized"
    message="You don't have permission to access this resource. Please sign in and try again."
    statusCode={401}
    showHomeButton={false}
    onRetry={() => (window.location.href = '/login')}
  />
);

// Server error (500)
export const ServerError = ({ onRetry }: { onRetry?: () => void }) => (
  <ErrorPage
    title="Server Error"
    message="Something went wrong on our end. We're working to fix it. Please try again in a few moments."
    statusCode={500}
    onRetry={onRetry}
  />
);


