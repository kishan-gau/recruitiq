import React, { ReactNode } from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helpText?: string;
}

/**
 * FormField component - Wraps form inputs with label, error message, and styling
 * Provides consistent form field UI across the application
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  children,
  helpText,
}) => {
  return (
    <div className="form-field mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="form-field-input">
        {children}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};
