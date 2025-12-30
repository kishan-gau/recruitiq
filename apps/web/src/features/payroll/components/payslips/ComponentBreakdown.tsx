import { DollarSign, TrendingUp, Percent, Info, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { 
  ComponentBreakdownResponse, 
  ComponentTaxBreakdown 
} from '@recruitiq/types';

import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { handleApiError } from '@/utils/errorHandler';


interface ComponentBreakdownProps {
  paycheckId: string;
}

export default function ComponentBreakdown({ paycheckId }: ComponentBreakdownProps) {
  const { paylinq } = usePaylinqAPI();
  const toast = useToast();
  const [breakdown, setBreakdown] = useState<ComponentBreakdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paycheckId) {
      loadComponentBreakdown();
    }
  }, [paycheckId]);

  const loadComponentBreakdown = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await paylinq.getPaycheckComponents(paycheckId);
      setBreakdown(response.data.components as ComponentBreakdownResponse);
    } catch (err: any) {
      console.error('Failed to load component breakdown:', err);
      const errorMessage = handleApiError(err, {
        toast,
        defaultMessage: 'Failed to load component breakdown',
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2,
    }).format(amount);

  const formatPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

  const getAllowanceLabel = (allowanceType?: string) => {
    switch (allowanceType) {
      case 'tax_free_sum_monthly':
        return 'Monthly Tax-Free Allowance';
      case 'holiday_allowance':
        return 'Holiday Allowance';
      case 'bonus_gratuity':
        return 'Bonus/Gratuity Allowance';
      default:
        return null;
    }
  };

  const getCalculationModeDescription = (mode: string): string => {
    switch (mode) {
      case 'proportional_distribution':
        return 'Tax calculated on total income, distributed proportionally to components';
      case 'component_based':
        return 'Tax calculated separately for each component';
      case 'aggregated':
        return 'Tax calculated on total income only (no component breakdown)';
      default:
        return mode;
    }
  };

  const renderComponentRow = (component: ComponentTaxBreakdown) => {
    const allowanceLabel = getAllowanceLabel(component.allowanceType);
    
    return (
      <div 
        key={component.componentId} 
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {component.componentName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {component.componentCode}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(component.amount)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gross Amount
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {/* Tax-Free Amount */}
          {component.taxFreeAmount > 0 && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Tax-Free Amount
                </span>
                {allowanceLabel && (
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      {allowanceLabel}: {formatCurrency(component.allowanceApplied)}
                    </div>
                  </div>
                )}
              </div>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(component.taxFreeAmount)}
              </span>
            </div>
          )}

          {/* Taxable Amount */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Taxable Amount
              </span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(component.taxableAmount)}
            </span>
          </div>

          {/* Tax Breakdown */}
          {component.taxableAmount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Tax Breakdown
              </p>
              
              {component.wageTax > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600 dark:text-gray-400">Wage Tax</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(component.wageTax)}
                  </span>
                </div>
              )}
              
              {component.aovTax > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600 dark:text-gray-400">AOV</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(component.aovTax)}
                  </span>
                </div>
              )}
              
              {component.awwTax > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600 dark:text-gray-400">AWW</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(component.awwTax)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between pl-4 pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-2">
                  <Percent className="w-3 h-3 text-gray-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Total Tax
                  </span>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(component.totalTax)}
                </span>
              </div>
              
              <div className="flex justify-between pl-4 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Effective Tax Rate
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatPercent(component.effectiveTaxRate)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading component breakdown...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-blue-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Summary
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Earnings
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(breakdown.summary.totalEarnings)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Tax-Free Amount
            </p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(breakdown.summary.totalTaxFree)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Taxable Amount
            </p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(breakdown.summary.totalTaxable)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Taxes
            </p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(breakdown.summary.totalTaxes)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Net Pay
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(breakdown.summary.netPay)}
            </p>
          </div>
        </div>

        {/* Calculation Modes */}
        {breakdown.summary.calculationModes && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Tax Calculation Methods
            </p>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between items-center">
                <span>Wage Tax:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-medium capitalize">
                    {breakdown.summary.calculationModes.wageTax.replace(/_/g, ' ')}
                  </span>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      {getCalculationModeDescription(breakdown.summary.calculationModes.wageTax)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>AOV:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-medium capitalize">
                    {breakdown.summary.calculationModes.aov.replace(/_/g, ' ')}
                  </span>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      {getCalculationModeDescription(breakdown.summary.calculationModes.aov)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>AWW:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-medium capitalize">
                    {breakdown.summary.calculationModes.aww.replace(/_/g, ' ')}
                  </span>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      {getCalculationModeDescription(breakdown.summary.calculationModes.aww)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Earnings Section */}
      {breakdown.earnings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
            Earnings Breakdown
          </h3>
          <div className="space-y-3">
            {breakdown.earnings.map(renderComponentRow)}
          </div>
        </div>
      )}

      {/* Tax Details */}
      {breakdown.summary.totalTaxes > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Percent className="w-5 h-5 mr-2 text-red-600" />
            Tax Summary
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Wage Tax</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(breakdown.summary.totalWageTax)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">AOV (Old Age Pension)</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(breakdown.summary.totalAovTax)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">AWW (Widow/Orphan)</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(breakdown.summary.totalAwwTax)}
              </span>
            </div>
            
            <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Taxes
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(breakdown.summary.totalTaxes)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Deductions Section */}
      {breakdown.deductions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Deductions
          </h3>
          <div className="space-y-3">
            {breakdown.deductions.map(renderComponentRow)}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      {breakdown.benefits.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Benefits
          </h3>
          <div className="space-y-3">
            {breakdown.benefits.map(renderComponentRow)}
          </div>
        </div>
      )}
    </div>
  );
}
