/**
 * FormField Component
 * 
 * Reusable form field wrapper with:
 * - Consistent label styling
 * - Error message display
 * - Help text support
 * - Required indicator
 * - Flexible input component composition
 */

import clsx from 'clsx';
import { AlertCircle, Info } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({
  label,
  error,
  helpText,
  required = false,
  optional = false,
  className,
  children,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {optional && !required && (
            <span className="text-gray-400 dark:text-gray-500 ml-1 font-normal">(optional)</span>
          )}
        </label>
      )}
      
      <div className="relative">
        {children}
      </div>
      
      {error && (
        <div className="flex items-start space-x-1 text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {helpText && !error && (
        <div className="flex items-start space-x-1 text-gray-500 dark:text-gray-400">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs">{helpText}</p>
        </div>
      )}
    </div>
  );
}

export interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  icon,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={clsx('bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6', className)}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

export interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function FormActions({
  onCancel,
  onSubmit,
  cancelLabel = 'Cancel',
  submitLabel = 'Submit',
  isSubmitting = false,
  submitDisabled = false,
  className,
  align = 'right',
}: FormActionsProps) {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={clsx(
      'flex items-center space-x-4 pt-6 border-t border-gray-200 dark:border-gray-800',
      alignmentClasses[align],
      className
    )}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cancelLabel}
        </button>
      )}
      
      {onSubmit && (
        <button
          type="submit"
          onClick={onSubmit}
          disabled={isSubmitting || submitDisabled}
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Submitting...
            </>
          ) : (
            submitLabel
          )}
        </button>
      )}
    </div>
  );
}

export interface FormGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 4 | 6 | 8;
  children: React.ReactNode;
  className?: string;
}

export function FormGrid({
  columns = 2,
  gap = 6,
  children,
  className,
}: FormGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  const gapClasses = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={clsx(
      'grid grid-cols-1',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

export interface InputGroupProps {
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InputGroup({
  prepend,
  append,
  children,
  className,
}: InputGroupProps) {
  return (
    <div className={clsx('flex items-stretch', className)}>
      {prepend && (
        <div className="inline-flex items-center px-3 border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm rounded-l-lg">
          {prepend}
        </div>
      )}
      
      <div className="flex-1">
        {children}
      </div>
      
      {append && (
        <div className="inline-flex items-center px-3 border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm rounded-r-lg">
          {append}
        </div>
      )}
    </div>
  );
}

export interface FieldsetProps {
  legend: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Fieldset({
  legend,
  description,
  children,
  className,
}: FieldsetProps) {
  return (
    <fieldset className={clsx('border border-gray-200 dark:border-gray-800 rounded-lg p-6', className)}>
      <legend className="text-base font-semibold text-gray-900 dark:text-white px-2 -ml-2">
        {legend}
      </legend>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">{description}</p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  );
}

