import { formatCurrency } from '@/utils/helpers';
import clsx from 'clsx';

interface CurrencyDisplayProps {
  amount: number;
  currency?: 'SRD' | 'USD';
  variant?: 'default' | 'positive' | 'negative';
  showSymbol?: boolean;
  className?: string;
}

export default function CurrencyDisplay({
  amount,
  currency = 'SRD',
  variant = 'default',
  showSymbol = true,
  className,
}: CurrencyDisplayProps) {
  const variantClasses = {
    default: 'text-gray-900 dark:text-gray-100',
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
  };

  const displayAmount = currency === 'SRD' ? formatCurrency(amount, showSymbol) : `$${amount.toLocaleString()}`;

  return (
    <span className={clsx('font-medium tabular-nums', variantClasses[variant], className)}>
      {displayAmount}
    </span>
  );
}
