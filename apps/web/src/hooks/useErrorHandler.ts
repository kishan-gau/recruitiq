/**
 * useErrorHandler Hook
 * 
 * Provides centralized error handling across the application.
 * Integrates with the toast notification system for user feedback.
 */

import { useToast } from '@/hooks/useToast';

interface ErrorHandlerOptions {
  toast?: boolean;
  log?: boolean;
  context?: string;
}

export function useErrorHandler() {
  const toast = useToast();

  const handleError = (
    error: Error | string,
    options: ErrorHandlerOptions = { toast: true, log: true }
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const context = options.context ? `[${options.context}] ` : '';

    // Log if enabled
    if (options.log) {
      console.error(`${context}Error:`, error);
    }

    // Show toast if enabled
    if (options.toast && toast) {
      toast.show(errorMessage);
    }

    return errorMessage;
  };

  return { handleError };
}
