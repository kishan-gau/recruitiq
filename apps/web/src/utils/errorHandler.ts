/*
 * Centralized Error Handling Utility
 * Provides user-friendly messages for API errors
 */

import type { AxiosError } from 'axios';

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  message?: string;
  details?: any;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toast?: {
    error: (message: string) => void;
  };
  defaultMessage?: string;
  logToConsole?: boolean;
}

export function getErrorMessage(error: unknown, defaultMessage = 'Er is een fout opgetreden'): string {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  if (!axiosError?.response) {
    if (axiosError?.message === 'Network Error') {
      return 'Netwerkfout. Controleer je internetverbinding.';
    }
    return axiosError?.message || defaultMessage;
  }

  const { status, data } = axiosError.response;

  switch (status) {
    case 400:
      return data?.error || data?.message || 'Ongeldige aanvraag. Controleer je invoer.';
    case 401:
      return 'Je sessie is verlopen. Log opnieuw in.';
    case 403:
      if (data?.errorCode === 'RBAC_MANAGEMENT_REQUIRED') {
        return 'Je hebt RBAC-beheertoestemmingen nodig voor deze actie.';
      }
      return data?.error || 'Toegang geweigerd. Ontbrekende rechten.';
    case 404:
      return data?.error || 'Bron niet gevonden.';
    case 409:
      return data?.error || 'Conflict met bestaande data.';
    case 422:
      return data?.error || 'Validatie mislukt. Controleer je invoer.';
    case 429:
      return 'Te veel verzoeken. Wacht even en probeer opnieuw.';
    case 500:
      return 'Serverfout. Probeer later opnieuw.';
    case 503:
      return 'Service tijdelijk niet beschikbaar.';
    default:
      return data?.error || data?.message || defaultMessage;
  }
}

export function handleApiError(error: unknown, options: ErrorHandlerOptions = {}): string {
  const {
    showToast = true,
    toast,
    defaultMessage = 'Er is een fout opgetreden',
    logToConsole = true,
  } = options;

  const message = getErrorMessage(error, defaultMessage);

  if (logToConsole && import.meta.env.DEV) {
    console.error('[API Error]:', {
      message,
      error,
      status: (error as AxiosError)?.response?.status,
      data: (error as AxiosError<ApiErrorResponse>)?.response?.data,
    });
  }

  if (showToast && toast) {
    toast.error(message);
  }

  return message;
}

export function isPermissionError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.status === 403;
}

export function isAuthError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.status === 401;
}

export function getValidationErrors(error: unknown): Record<string, string> | null {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const status = axiosError.response?.status;

  if (status !== 400 && status !== 422) {
    return null;
  }

  const data = axiosError.response?.data;
  if (data?.details && typeof data.details === 'object') {
    return data.details as Record<string, string>;
  }

  return null;
}
