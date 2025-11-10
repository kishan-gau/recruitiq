/**
 * CurrencyInput Component
 * 
 * Reusable currency input with:
 * - Automatic formatting with thousand separators
 * - Currency symbol display
 * - Decimal precision control
 * - Min/max value constraints
 * - Support for multiple currencies
 */

import { useState, useEffect, forwardRef } from 'react';
import { DollarSign } from 'lucide-react';
import clsx from 'clsx';

export interface CurrencyInputProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  currency?: 'SRD' | 'USD' | 'EUR';
  min?: number;
  max?: number;
  precision?: number;
  className?: string;
  showSymbol?: boolean;
  name?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  SRD: 'Sr$',
  USD: '$',
  EUR: '€',
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder = '0.00',
      error,
      required = false,
      disabled = false,
      currency = 'SRD',
      min,
      max,
      precision = 2,
      className,
      showSymbol = true,
      name,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Format number with thousand separators
    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
    };

    // Parse formatted string to number
    const parseNumber = (str: string): number | null => {
      const cleaned = str.replace(/[^0-9.-]/g, '');
      if (cleaned === '' || cleaned === '-') return null;
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Update display value when value prop changes
    useEffect(() => {
      if (value !== null && value !== undefined && !isFocused) {
        setDisplayValue(formatNumber(value));
      } else if ((value === null || value === undefined) && !isFocused) {
        setDisplayValue('');
      }
    }, [value, isFocused]);

    const handleFocus = () => {
      setIsFocused(true);
      // Show unformatted value when focused
      if (value !== null && value !== undefined) {
        setDisplayValue(value.toFixed(precision));
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      const numValue = parseNumber(displayValue);
      
      if (numValue !== null) {
        // Apply min/max constraints
        let constrainedValue = numValue;
        if (min !== undefined && numValue < min) {
          constrainedValue = min;
        }
        if (max !== undefined && numValue > max) {
          constrainedValue = max;
        }
        
        // Round to precision
        constrainedValue = parseFloat(constrainedValue.toFixed(precision));
        
        onChange(constrainedValue);
        setDisplayValue(formatNumber(constrainedValue));
      } else {
        onChange(null);
        setDisplayValue('');
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Allow numbers, decimal point, minus sign, and comma
      const cleaned = input.replace(/[^0-9.-]/g, '');
      
      // Prevent multiple decimal points
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        return;
      }
      
      // Limit decimal places while typing
      if (parts.length === 2 && parts[1].length > precision) {
        return;
      }
      
      setDisplayValue(cleaned);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
        return;
      }
      
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
        return;
      }
      
      // Allow: home, end, left, right
      if (e.keyCode >= 35 && e.keyCode <= 39) {
        return;
      }
      
      // Allow: minus sign at start
      if (e.key === '-' && (e.target as HTMLInputElement).selectionStart === 0) {
        return;
      }
      
      // Allow: decimal point (only one)
      if (e.key === '.' && !displayValue.includes('.')) {
        return;
      }
      
      // Ensure that it is a number
      if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    };

    return (
      <div className={clsx('relative', className)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {showSymbol && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <span className={clsx(
                'text-sm font-medium',
                disabled ? 'text-gray-400' : 'text-gray-600'
              )}>
                {CURRENCY_SYMBOLS[currency]}
              </span>
            </div>
          )}
          
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            name={name}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className={clsx(
              'w-full py-2 pr-3 border rounded-lg transition-colors',
              'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              showSymbol ? 'pl-12' : 'pl-3',
              disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
              error ? 'border-red-300' : 'border-gray-300',
              'font-mono text-right'
            )}
          />
          
          {!showSymbol && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <DollarSign className={clsx(
                'w-4 h-4',
                disabled ? 'text-gray-300' : 'text-gray-400'
              )} />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        
        {(min !== undefined || max !== undefined) && !error && (
          <p className="mt-1 text-xs text-gray-500">
            {min !== undefined && max !== undefined && `Range: ${formatNumber(min)} - ${formatNumber(max)}`}
            {min !== undefined && max === undefined && `Min: ${formatNumber(min)}`}
            {min === undefined && max !== undefined && `Max: ${formatNumber(max)}`}
          </p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

