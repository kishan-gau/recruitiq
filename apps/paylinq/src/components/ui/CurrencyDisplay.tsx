import { formatCurrency } from '@/utils/helpers';
import clsx from 'clsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';

interface ConversionInfo {
  originalAmount: number;
  originalCurrency: string;
  rate: number;
  conversionDate?: Date;
  source?: string;
}

interface CurrencyDisplayProps {
  amount: number;
  currency?: string; // Changed to support any currency code
  variant?: 'default' | 'positive' | 'negative';
  showSymbol?: boolean;
  className?: string;
  // Multi-currency enhancement
  conversion?: ConversionInfo;
  showConversionTooltip?: boolean;
  compact?: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  SRD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  // Add more as needed
};

const CURRENCY_NAMES: Record<string, string> = {
  SRD: 'Surinamese Dollar',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
};

export default function CurrencyDisplay({
  amount,
  currency = 'SRD',
  variant = 'default',
  showSymbol = true,
  className,
  conversion,
  showConversionTooltip = true,
  compact = false,
}: CurrencyDisplayProps) {
  const variantClasses = {
    default: 'text-gray-900 dark:text-gray-100',
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
  };

  const formatAmount = (value: number, curr: string): string => {
    if (curr === 'SRD') {
      return formatCurrency(value, showSymbol);
    }
    
    const symbol = showSymbol && CURRENCY_SYMBOLS[curr] ? CURRENCY_SYMBOLS[curr] : '';
    const formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    if (symbol) {
      return `${symbol}${formatted}`;
    }
    return `${formatted} ${curr}`;
  };

  const displayAmount = formatAmount(amount, currency);

  // Render without tooltip if no conversion info
  if (!conversion || !showConversionTooltip) {
    return (
      <span className={clsx('font-medium tabular-nums', variantClasses[variant], className)}>
        {displayAmount}
        {conversion && !compact && (
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            ({currency})
          </span>
        )}
      </span>
    );
  }

  // Render with conversion tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={clsx(
              'font-medium tabular-nums cursor-help border-b border-dashed border-gray-400',
              variantClasses[variant],
              className
            )}
          >
            {displayAmount}
            {!compact && (
              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                ({currency})
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Original Amount:</span>
              <span className="font-medium">
                {formatAmount(conversion.originalAmount, conversion.originalCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Exchange Rate:</span>
              <span className="font-medium">
                1 {conversion.originalCurrency} = {conversion.rate.toFixed(4)} {currency}
              </span>
            </div>
            {conversion.source && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Source:</span>
                <span className="text-xs capitalize">{conversion.source}</span>
              </div>
            )}
            {conversion.conversionDate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Date:</span>
                <span className="text-xs">
                  {new Date(conversion.conversionDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Export currency utilities for use in other components
export { CURRENCY_SYMBOLS, CURRENCY_NAMES };
