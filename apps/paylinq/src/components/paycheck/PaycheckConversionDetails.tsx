import React from 'react';
import { format } from 'date-fns';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../ui/CurrencyDisplay';

interface ConversionDetails {
  baseCurrency: string;
  paymentCurrency: string;
  baseAmount: number;
  convertedAmount: number;
  exchangeRate: number;
  conversionDate: string;
  roundingMethod?: string;
  source?: string;
}

interface PaycheckConversionDetailsProps {
  conversion: ConversionDetails;
  showBreakdown?: boolean;
  className?: string;
}

const PaycheckConversionDetails: React.FC<PaycheckConversionDetailsProps> = ({
  conversion,
  showBreakdown = true,
  className = '',
}) => {
  const {
    baseCurrency,
    paymentCurrency,
    baseAmount,
    convertedAmount,
    exchangeRate,
    conversionDate,
    roundingMethod,
    source,
  } = conversion;

  // Check if conversion actually occurred
  const isConverted = baseCurrency !== paymentCurrency;

  if (!isConverted) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string) => {
    return `${CURRENCY_SYMBOLS[currency] || currency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatRate = (rate: number) => {
    return rate.toFixed(6);
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-900">
          Currency Conversion Applied
        </h4>
        {source && (
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {source}
          </span>
        )}
      </div>

      {/* Main Conversion Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">Original Amount:</span>
          <span className="text-sm font-mono font-semibold text-blue-900">
            {formatCurrency(baseAmount, baseCurrency)}
          </span>
        </div>

        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-blue-300" />
            <span className="text-xs text-blue-600">converted at</span>
            <div className="h-px w-8 bg-blue-300" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-blue-100 -mx-4 px-4 py-2 rounded">
          <span className="text-sm text-blue-700">Exchange Rate:</span>
          <span className="text-sm font-mono font-semibold text-blue-900">
            1 {baseCurrency} = {formatRate(exchangeRate)} {paymentCurrency}
          </span>
        </div>

        <div className="flex items-center justify-center py-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">Payment Amount:</span>
          <span className="text-lg font-mono font-bold text-blue-900">
            {formatCurrency(convertedAmount, paymentCurrency)}
          </span>
        </div>
      </div>

      {/* Breakdown Section */}
      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <h5 className="text-xs font-medium text-blue-800 mb-2">Conversion Details</h5>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-blue-600">From:</span>
              <p className="font-medium text-blue-900">
                {CURRENCY_NAMES[baseCurrency] || baseCurrency}
              </p>
            </div>
            <div>
              <span className="text-blue-600">To:</span>
              <p className="font-medium text-blue-900">
                {CURRENCY_NAMES[paymentCurrency] || paymentCurrency}
              </p>
            </div>
            <div>
              <span className="text-blue-600">Conversion Date:</span>
              <p className="font-medium text-blue-900">
                {format(new Date(conversionDate), 'MMM d, yyyy')}
              </p>
            </div>
            {roundingMethod && (
              <div>
                <span className="text-blue-600">Rounding:</span>
                <p className="font-medium text-blue-900 capitalize">
                  {roundingMethod.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>

          {/* Calculation Example */}
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
            <p className="text-blue-700">
              <span className="font-mono">{baseAmount.toFixed(2)}</span>
              {' × '}
              <span className="font-mono">{formatRate(exchangeRate)}</span>
              {' = '}
              <span className="font-mono font-semibold">{convertedAmount.toFixed(2)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Inverse Rate Helper */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-blue-600">
          <span className="font-medium">Inverse rate:</span>
          {' '}
          1 {paymentCurrency} = {(1 / exchangeRate).toFixed(6)} {baseCurrency}
        </p>
      </div>
    </div>
  );
};

export default PaycheckConversionDetails;
