/**
 * FormField Component
 * Wrapper for form fields with labels and error handling
 */

import React from 'react';

interface FormFieldProps {
  label?: string;
  error?: string | boolean;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && typeof error === 'string' && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

export default FormField;
