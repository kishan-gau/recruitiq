/**
 * CurrencySelector Component
 * Dropdown for selecting currencies
 */

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  currencies?: string[];
  label?: string;
  error?: string;
  required?: boolean;
}

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'];

export function CurrencySelector({
  value,
  onChange,
  currencies = DEFAULT_CURRENCIES,
  label = 'Currency',
  error,
  required,
}: CurrencySelectorProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
        required={required}
      >
        {currencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
