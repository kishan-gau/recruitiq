import { ReactNode } from 'react';
import clsx from 'clsx';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}

export default function FormField({ label, error, required, children, htmlFor, hint }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        'w-full px-3 py-2 border rounded-lg transition-colors',
        'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
        'focus:ring-2 focus:ring-emerald-500 focus:outline-none',
        error
          ? 'border-red-500 dark:border-red-500'
          : 'border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    />
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function TextArea({ error, className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={clsx(
        'w-full px-3 py-2 border rounded-lg transition-colors',
        'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
        'focus:ring-2 focus:ring-emerald-500 focus:outline-none',
        error
          ? 'border-red-500 dark:border-red-500'
          : 'border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
}

export function Select({ error, options, className, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        'w-full px-3 py-2 border rounded-lg transition-colors',
        'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
        'focus:ring-2 focus:ring-emerald-500 focus:outline-none',
        error
          ? 'border-red-500 dark:border-red-500'
          : 'border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

