import { format } from 'date-fns';
import React, { useState, useEffect } from 'react';

import type {
  ExchangeRate} from '@/hooks';
import {
  useCreateExchangeRate,
  useUpdateExchangeRate
} from '@/hooks';
import Button from '@recruitiq/ui';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../shared/CurrencyDisplay';
import CurrencySelector from '../ui/CurrencySelector';

interface ExchangeRateFormProps {
  rate?: ExchangeRate;
  onSuccess: () => void;
  onCancel: () => void;
}

const ExchangeRateForm: React.FC<ExchangeRateFormProps> = ({
  rate,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    fromCurrency: rate?.from_currency || 'USD',
    toCurrency: rate?.to_currency || 'SRD',
    rate: rate?.rate?.toString() || '',
    source: rate?.source || 'manual',
    sourceProvider: rate?.source_provider || '',
    effectiveFrom: rate?.effective_from 
      ? format(new Date(rate.effective_from), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    effectiveTo: rate?.effective_to 
      ? format(new Date(rate.effective_to), 'yyyy-MM-dd')
      : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inverseRate, setInverseRate] = useState<string>('');

  const createRate = useCreateExchangeRate();
  const updateRate = useUpdateExchangeRate();

  const isEditing = !!rate;

  // Calculate inverse rate
  useEffect(() => {
    const rateValue = parseFloat(formData.rate);
    if (!isNaN(rateValue) && rateValue > 0) {
      setInverseRate((1 / rateValue).toFixed(6));
    } else {
      setInverseRate('');
    }
  }, [formData.rate]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fromCurrency) {
      newErrors.fromCurrency = 'From currency is required';
    }

    if (!formData.toCurrency) {
      newErrors.toCurrency = 'To currency is required';
    }

    if (formData.fromCurrency === formData.toCurrency) {
      newErrors.toCurrency = 'To currency must be different from From currency';
    }

    const rateValue = parseFloat(formData.rate);
    if (!formData.rate || isNaN(rateValue) || rateValue <= 0) {
      newErrors.rate = 'Rate must be a positive number';
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective from date is required';
    }

    if (formData.effectiveTo) {
      const fromDate = new Date(formData.effectiveFrom);
      const toDate = new Date(formData.effectiveTo);
      if (toDate <= fromDate) {
        newErrors.effectiveTo = 'Effective to date must be after effective from date';
      }
    }

    if (formData.source === 'api' && !formData.sourceProvider) {
      newErrors.sourceProvider = 'Source provider is required for API source';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const rateData = {
      fromCurrency: formData.fromCurrency,
      toCurrency: formData.toCurrency,
      rate: parseFloat(formData.rate),
      source: formData.source as 'manual' | 'api' | 'system',
      sourceProvider: formData.sourceProvider || undefined,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || undefined,
    };

    try {
      if (isEditing) {
        await updateRate.mutateAsync({
          id: rate.id,
          data: rateData,
        });
      } else {
        await createRate.mutateAsync(rateData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save exchange rate:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save exchange rate';
      setErrors({ submit: errorMessage });
    }
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle swap currencies
  const handleSwapCurrencies = () => {
    setFormData(prev => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency,
      rate: inverseRate,
    }));
  };

  const isPending = createRate.isPending || updateRate.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Currency Pair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Currency <span className="text-red-500">*</span>
          </label>
          <CurrencySelector
            value={formData.fromCurrency}
            onChange={(value) => handleChange('fromCurrency', value)}
            error={errors.fromCurrency}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Currency <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <CurrencySelector
                value={formData.toCurrency}
                onChange={(value) => handleChange('toCurrency', value)}
                error={errors.toCurrency}
              />
            </div>
            <button
              type="button"
              onClick={handleSwapCurrencies}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              title="Swap currencies"
            >
              ⇄
            </button>
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Exchange Rate <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.000001"
          value={formData.rate}
          onChange={(e) => handleChange('rate', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.rate ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter exchange rate"
        />
        {errors.rate && (
          <p className="mt-1 text-sm text-red-600">{errors.rate}</p>
        )}
        {inverseRate && !errors.rate && (
          <p className="mt-1 text-sm text-gray-500">
            Inverse rate: 1 {formData.toCurrency} = {inverseRate} {formData.fromCurrency}
          </p>
        )}
      </div>

      {/* Rate Preview */}
      {formData.rate && !errors.rate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Rate Preview</p>
          <div className="space-y-1 text-sm text-blue-800">
            <p>
              1 {formData.fromCurrency} = {formData.rate} {formData.toCurrency}
            </p>
            <p>
              100 {formData.fromCurrency} = {(parseFloat(formData.rate) * 100).toFixed(2)} {formData.toCurrency}
            </p>
            <p>
              1,000 {formData.fromCurrency} = {(parseFloat(formData.rate) * 1000).toFixed(2)} {formData.toCurrency}
            </p>
          </div>
        </div>
      )}

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.source}
          onChange={(e) => handleChange('source', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="manual">Manual Entry</option>
          <option value="api">API (External Provider)</option>
          <option value="system">System Generated</option>
        </select>
      </div>

      {/* Source Provider (conditional) */}
      {formData.source === 'api' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source Provider <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.sourceProvider}
            onChange={(e) => handleChange('sourceProvider', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.sourceProvider ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., fixer.io, exchangerate-api.com"
          />
          {errors.sourceProvider && (
            <p className="mt-1 text-sm text-red-600">{errors.sourceProvider}</p>
          )}
        </div>
      )}

      {/* Effective Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effective From <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.effectiveFrom}
            onChange={(e) => handleChange('effectiveFrom', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.effectiveFrom ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.effectiveFrom && (
            <p className="mt-1 text-sm text-red-600">{errors.effectiveFrom}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effective To (Optional)
          </label>
          <input
            type="date"
            value={formData.effectiveTo}
            onChange={(e) => handleChange('effectiveTo', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.effectiveTo ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.effectiveTo && (
            <p className="mt-1 text-sm text-red-600">{errors.effectiveTo}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Leave empty for an open-ended rate
          </p>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending ? 'Saving...' : isEditing ? 'Update Rate' : 'Create Rate'}
        </Button>
      </div>
    </form>
  );
};

export default ExchangeRateForm;
