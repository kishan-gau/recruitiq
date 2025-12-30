import { format } from 'date-fns';
import React from 'react';

import { useConversionHistory } from '../../hooks/useCurrency';
import CurrencyDisplay from '../ui/CurrencyDisplay';

import PaycheckConversionDetails from './PaycheckConversionDetails';


interface PaycheckComponentDetail {
  id: string;
  name: string;
  componentType: 'earning' | 'deduction' | 'tax' | 'benefit';
  amount: number;
  currency?: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

interface Paycheck {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  baseCurrency: string;
  paymentCurrency: string;
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  totalTaxes: number;
  exchangeRateUsed?: number;
  conversionSummary?: {
    originalGross: number;
    originalNet: number;
    conversionDate: string;
    roundingMethod?: string;
    source?: string;
  };
  components: PaycheckComponentDetail[];
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
}

interface EnhancedPaycheckDisplayProps {
  paycheck: Paycheck;
  showConversionDetails?: boolean;
  showComponentBreakdown?: boolean;
  onAction?: (action: 'approve' | 'pay' | 'void', paycheckId: string) => void;
}

const EnhancedPaycheckDisplay: React.FC<EnhancedPaycheckDisplayProps> = ({
  paycheck,
  showConversionDetails = true,
  showComponentBreakdown = true,
  onAction,
}) => {
  const { data: conversionHistory } = useConversionHistory('paycheck', paycheck.id);

  const isConverted = paycheck.baseCurrency !== paycheck.paymentCurrency;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComponentTypeColor = (type: string) => {
    switch (type) {
      case 'earning':
        return 'text-green-700';
      case 'deduction':
        return 'text-orange-700';
      case 'tax':
        return 'text-red-700';
      case 'benefit':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {paycheck.employeeName}
            </h3>
            <p className="text-sm text-gray-500">
              Pay Period: {format(new Date(paycheck.payPeriodStart), 'MMM d')} - {format(new Date(paycheck.payPeriodEnd), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(paycheck.status)}`}>
              {paycheck.status.charAt(0).toUpperCase() + paycheck.status.slice(1)}
            </span>
            {isConverted && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Multi-Currency
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Gross Pay</p>
            <CurrencyDisplay
              amount={paycheck.grossPay}
              currency={paycheck.paymentCurrency}
              className="text-xl font-bold text-gray-900"
            />
            {isConverted && paycheck.conversionSummary && (
              <p className="text-xs text-gray-500 mt-1">
                Original: <CurrencyDisplay
                  amount={paycheck.conversionSummary.originalGross}
                  currency={paycheck.baseCurrency}
                  className="font-medium"
                />
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Total Deductions</p>
            <CurrencyDisplay
              amount={paycheck.totalDeductions}
              currency={paycheck.paymentCurrency}
              className="text-xl font-bold text-orange-600"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Net Pay</p>
            <CurrencyDisplay
              amount={paycheck.netPay}
              currency={paycheck.paymentCurrency}
              className="text-xl font-bold text-green-600"
            />
            {isConverted && paycheck.conversionSummary && (
              <p className="text-xs text-gray-500 mt-1">
                Original: <CurrencyDisplay
                  amount={paycheck.conversionSummary.originalNet}
                  currency={paycheck.baseCurrency}
                  className="font-medium"
                />
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Details */}
      {isConverted && showConversionDetails && paycheck.conversionSummary && paycheck.exchangeRateUsed && (
        <div className="px-6 py-4">
          <PaycheckConversionDetails
            conversion={{
              baseCurrency: paycheck.baseCurrency,
              paymentCurrency: paycheck.paymentCurrency,
              baseAmount: paycheck.conversionSummary.originalGross,
              convertedAmount: paycheck.grossPay,
              exchangeRate: paycheck.exchangeRateUsed,
              conversionDate: paycheck.conversionSummary.conversionDate,
              roundingMethod: paycheck.conversionSummary.roundingMethod,
              source: paycheck.conversionSummary.source,
            }}
          />
        </div>
      )}

      {/* Component Breakdown */}
      {showComponentBreakdown && paycheck.components.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Pay Components
          </h4>
          <div className="space-y-2">
            {paycheck.components.map((component) => (
              <div
                key={component.id}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className={`text-sm font-medium ${getComponentTypeColor(component.componentType)}`}>
                    {component.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {component.componentType}
                  </p>
                </div>
                <div className="text-right">
                  <CurrencyDisplay
                    amount={component.amount}
                    currency={component.currency || paycheck.paymentCurrency}
                    className="text-sm font-semibold text-gray-900"
                  />
                  {component.originalAmount && component.originalCurrency && 
                   component.originalCurrency !== (component.currency || paycheck.paymentCurrency) && (
                    <p className="text-xs text-gray-500">
                      <CurrencyDisplay
                        amount={component.originalAmount}
                        currency={component.originalCurrency}
                        compact
                      />
                      {component.exchangeRate && (
                        <span className="ml-1">
                          @ {component.exchangeRate.toFixed(4)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Component Totals */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Earnings:</span>
              <CurrencyDisplay
                amount={paycheck.components
                  .filter(c => c.componentType === 'earning')
                  .reduce((sum, c) => sum + c.amount, 0)}
                currency={paycheck.paymentCurrency}
                className="font-semibold text-green-600"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Deductions:</span>
              <CurrencyDisplay
                amount={paycheck.components
                  .filter(c => c.componentType === 'deduction')
                  .reduce((sum, c) => sum + c.amount, 0)}
                currency={paycheck.paymentCurrency}
                className="font-semibold text-orange-600"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Taxes:</span>
              <CurrencyDisplay
                amount={paycheck.components
                  .filter(c => c.componentType === 'tax')
                  .reduce((sum, c) => sum + c.amount, 0)}
                currency={paycheck.paymentCurrency}
                className="font-semibold text-red-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Conversion History */}
      {conversionHistory && conversionHistory.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Conversion History
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {conversionHistory.map((conversion, index) => (
              <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {conversion.from_currency} → {conversion.to_currency}
                  </span>
                  <span className="font-mono text-gray-900">
                    {conversion.rate_used.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-gray-500">
                  <span>
                    {format(new Date(conversion.conversion_date), 'MMM d, yyyy HH:mm')}
                  </span>
                  <span>
                    <CurrencyDisplay
                      amount={conversion.from_amount}
                      currency={conversion.from_currency}
                      compact
                    />
                    {' → '}
                    <CurrencyDisplay
                      amount={conversion.to_amount}
                      currency={conversion.to_currency}
                      compact
                    />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {onAction && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
          {paycheck.status === 'draft' && (
            <>
              <button
                onClick={() => onAction('approve', paycheck.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => onAction('void', paycheck.id)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Void
              </button>
            </>
          )}
          {paycheck.status === 'approved' && (
            <button
              onClick={() => onAction('pay', paycheck.id)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Mark as Paid
            </button>
          )}
        </div>
      )}

      {/* Pay Date Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Pay Date: {format(new Date(paycheck.payDate), 'EEEE, MMMM d, yyyy')}
      </div>
    </div>
  );
};

export default EnhancedPaycheckDisplay;
