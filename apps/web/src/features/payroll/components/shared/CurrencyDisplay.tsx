/**
 * CurrencyDisplay Component
 * Displays currency amounts with proper formatting
 */

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  showSymbol?: boolean;
  className?: string;
}

export function CurrencyDisplay({ 
  amount, 
  currency = 'USD', 
  showSymbol = true,
  className = '' 
}: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <span className={`font-medium ${className}`}>
      {formatted}
    </span>
  );
}
