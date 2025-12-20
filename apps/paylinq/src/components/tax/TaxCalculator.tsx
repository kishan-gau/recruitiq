/**
 * Tax Calculator Component
 * Allows users to preview tax calculations for an employee
 */

import { useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { useCalculateTaxes } from '@/hooks/useTaxRules';
import { useToast } from '@/contexts/ToastContext';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';

interface TaxCalculation {
  taxType: string;
  taxAmount: number;
  taxRate?: number;
  jurisdiction?: string;
}

interface TaxCalculatorProps {
  onClose?: () => void;
}

export default function TaxCalculator({ onClose }: TaxCalculatorProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [grossPay, setGrossPay] = useState<number>(0);
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [result, setResult] = useState<TaxCalculation[] | null>(null);

  const calculateMutation = useCalculateTaxes();
  const { error: errorToast } = useToast();

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !grossPay || !payPeriodStart || !payPeriodEnd) {
      errorToast('Please fill in all required fields');
      return;
    }

    try {
      const calculations = await calculateMutation.mutateAsync({
        employeeId,
        grossPay,
        payPeriodStart,
        payPeriodEnd,
      });
      setResult(calculations);
    } catch (err) {
      errorToast(err instanceof Error ? err.message : 'Failed to calculate taxes');
      setResult(null);
    }
  };

  const totalTax = result?.reduce((sum, calc) => sum + calc.taxAmount, 0) || 0;
  const netPay = grossPay - totalTax;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tax Calculator
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        )}
      </div>

      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Employee ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Employee ID *
          </label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Enter employee ID"
            required
          />
        </div>

        {/* Gross Pay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gross Pay (SRD) *
          </label>
          <input
            type="number"
            value={grossPay || ''}
            onChange={(e) => setGrossPay(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Pay Period */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period Start *
            </label>
            <input
              type="date"
              value={payPeriodStart}
              onChange={(e) => setPayPeriodStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period End *
            </label>
            <input
              type="date"
              value={payPeriodEnd}
              onChange={(e) => setPayPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Calculate Button */}
        <button
          type="submit"
          disabled={calculateMutation.isPending}
          className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {calculateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              Calculate Taxes
            </>
          )}
        </button>
      </form>

      {/* Results */}
      {result && result.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Tax Breakdown
          </h4>

          {/* Individual Tax Items */}
          <div className="space-y-2">
            {result.map((calc, index) => (
              <div
                key={index}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {calc.taxType}
                  </span>
                  {calc.taxRate && (
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      ({calc.taxRate}%)
                    </span>
                  )}
                  {calc.jurisdiction && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                      ({calc.jurisdiction})
                    </span>
                  )}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={calc.taxAmount} />
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Gross Pay
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                <CurrencyDisplay amount={grossPay} />
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Tax
              </span>
              <span className="text-sm font-medium text-red-600">
                -<CurrencyDisplay amount={totalTax} />
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Net Pay
              </span>
              <span className="text-base font-semibold text-green-600">
                <CurrencyDisplay amount={netPay} />
              </span>
            </div>
          </div>

          {/* Effective Rate */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Effective Tax Rate
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {grossPay > 0 ? ((totalTax / grossPay) * 100).toFixed(2) : '0.00'}%
            </div>
          </div>
        </div>
      )}

      {result && result.length === 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No taxes calculated for this employee.
          </p>
        </div>
      )}
    </div>
  );
}
