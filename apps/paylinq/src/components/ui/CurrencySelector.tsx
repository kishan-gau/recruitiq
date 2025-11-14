import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from './CurrencyDisplay';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  supportedCurrencies?: string[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  showSearch?: boolean;
}

const DEFAULT_CURRENCIES = ['SRD', 'USD', 'EUR', 'GBP'];

export default function CurrencySelector({
  value,
  onChange,
  supportedCurrencies = DEFAULT_CURRENCIES,
  label,
  placeholder = 'Select currency',
  disabled = false,
  required = false,
  error,
  className,
  showSearch = true,
}: CurrencySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCurrencies = useMemo(() => {
    if (!showSearch || !searchQuery) {
      return supportedCurrencies;
    }

    const query = searchQuery.toLowerCase();
    return supportedCurrencies.filter(
      (curr) =>
        curr.toLowerCase().includes(query) ||
        CURRENCY_NAMES[curr]?.toLowerCase().includes(query)
    );
  }, [supportedCurrencies, searchQuery, showSearch]);

  const handleSelect = (currency: string) => {
    onChange(currency);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedCurrency = supportedCurrencies.includes(value) ? value : '';
  const selectedSymbol = CURRENCY_SYMBOLS[selectedCurrency] || '';
  const selectedName = CURRENCY_NAMES[selectedCurrency] || '';

  return (
    <div className={clsx('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            'w-full px-4 py-2 text-left bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedCurrency ? (
                <>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedSymbol} {selectedCurrency}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedName}
                  </span>
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
              )}
            </div>
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                isOpen && 'transform rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
            {showSearch && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search currencies..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            )}

            <div className="overflow-y-auto max-h-48">
              {filteredCurrencies.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No currencies found
                </div>
              ) : (
                filteredCurrencies.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleSelect(currency)}
                    className={clsx(
                      'w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                      currency === value && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {CURRENCY_SYMBOLS[currency] || ''} {currency}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {CURRENCY_NAMES[currency] || currency}
                        </span>
                      </div>
                      {currency === value && (
                        <svg
                          className="w-5 h-5 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
