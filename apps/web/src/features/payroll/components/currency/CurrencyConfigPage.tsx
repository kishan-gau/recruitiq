import React, { useState, useEffect } from 'react';

import {
  useCurrencyConfig,
  useUpdateCurrencyConfig,
  useCacheStats,
  useClearCache,
} from '../../hooks/useCurrency';
import Button from '../ui/Button';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../ui/CurrencyDisplay';

const AVAILABLE_CURRENCIES = [
  'USD', 'SRD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL',
];

const CurrencyConfigPage: React.FC = () => {
  const { data: config, isLoading, refetch } = useCurrencyConfig();
  const updateConfig = useUpdateCurrencyConfig();
  const { data: cacheStats } = useCacheStats();
  const clearCache = useClearCache();

  const [formData, setFormData] = useState({
    baseCurrency: '',
    supportedCurrencies: [] as string[],
    autoUpdateRates: false,
    rateUpdateFrequency: 'daily',
    defaultRateSource: 'manual',
    allowManualRates: true,
    requireRateApproval: false,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load config into form
  useEffect(() => {
    if (config) {
      setFormData({
        baseCurrency: config.base_currency || 'SRD',
        supportedCurrencies: config.supported_currencies || ['SRD', 'USD'],
        autoUpdateRates: config.auto_update_rates || false,
        rateUpdateFrequency: config.rate_update_frequency || 'daily',
        defaultRateSource: config.default_rate_source || 'manual',
        allowManualRates: config.allow_manual_rates !== false,
        requireRateApproval: config.require_rate_approval || false,
      });
    }
  }, [config]);

  // Handle input change
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  // Handle toggle currency
  const handleToggleCurrency = (currency: string) => {
    setFormData(prev => {
      const isSelected = prev.supportedCurrencies.includes(currency);
      let newCurrencies: string[];

      if (isSelected) {
        // Don't allow removing base currency
        if (currency === prev.baseCurrency) {
          return prev;
        }
        newCurrencies = prev.supportedCurrencies.filter(c => c !== currency);
      } else {
        newCurrencies = [...prev.supportedCurrencies, currency];
      }

      return {
        ...prev,
        supportedCurrencies: newCurrencies,
      };
    });
    setHasChanges(true);
    setSaveMessage(null);
  };

  // Handle save
  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(formData);
      setHasChanges(false);
      setSaveMessage({ type: 'success', text: 'Configuration saved successfully' });
      refetch();
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save configuration',
      });
    }
  };

  // Handle clear cache
  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear the exchange rate cache?')) {
      try {
        await clearCache.mutateAsync();
        setSaveMessage({ type: 'success', text: 'Cache cleared successfully' });
      } catch (error) {
        console.error('Failed to clear cache:', error);
        setSaveMessage({ type: 'error', text: 'Failed to clear cache' });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Currency Configuration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure multi-currency settings for your organization
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`border rounded-lg p-4 ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm ${
            saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {saveMessage.text}
          </p>
        </div>
      )}

      {/* Base Currency */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Base Currency</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Base Currency
          </label>
          <select
            value={formData.baseCurrency}
            onChange={(e) => handleChange('baseCurrency', e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {AVAILABLE_CURRENCIES.map(currency => (
              <option key={currency} value={currency}>
                {CURRENCY_SYMBOLS[currency]} {currency} - {CURRENCY_NAMES[currency]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500">
            This is the primary currency used for financial reporting and calculations
          </p>
        </div>
      </div>

      {/* Supported Currencies */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Supported Currencies</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select the currencies you want to support for payroll processing
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {AVAILABLE_CURRENCIES.map(currency => {
            const isSelected = formData.supportedCurrencies.includes(currency);
            const isBaseCurrency = currency === formData.baseCurrency;

            return (
              <button
                key={currency}
                type="button"
                onClick={() => handleToggleCurrency(currency)}
                disabled={isBaseCurrency}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isBaseCurrency ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-2xl">{CURRENCY_SYMBOLS[currency]}</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{currency}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {CURRENCY_NAMES[currency]}
                  </p>
                </div>
                {isSelected && (
                  <svg className="ml-auto w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {formData.baseCurrency && (
          <p className="mt-3 text-xs text-gray-500">
            Base currency ({formData.baseCurrency}) is always included
          </p>
        )}
      </div>

      {/* Exchange Rate Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Exchange Rate Settings</h2>
        
        <div className="space-y-4">
          {/* Auto Update */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Auto-Update Exchange Rates
              </label>
              <p className="text-sm text-gray-500">
                Automatically fetch rates from external providers
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('autoUpdateRates', !formData.autoUpdateRates)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.autoUpdateRates ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.autoUpdateRates ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Update Frequency */}
          {formData.autoUpdateRates && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Frequency
              </label>
              <select
                value={formData.rateUpdateFrequency}
                onChange={(e) => handleChange('rateUpdateFrequency', e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}

          {/* Default Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Rate Source
            </label>
            <select
              value={formData.defaultRateSource}
              onChange={(e) => handleChange('defaultRateSource', e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="manual">Manual Entry</option>
              <option value="api">API (External Provider)</option>
              <option value="system">System Generated</option>
            </select>
          </div>

          {/* Allow Manual Rates */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Allow Manual Rate Entry
              </label>
              <p className="text-sm text-gray-500">
                Permit users to manually enter exchange rates
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('allowManualRates', !formData.allowManualRates)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.allowManualRates ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.allowManualRates ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Require Approval */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Require Rate Approval
              </label>
              <p className="text-sm text-gray-500">
                Manual rates must be approved before use
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('requireRateApproval', !formData.requireRateApproval)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.requireRateApproval ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.requireRateApproval ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Cache Statistics</h2>
            <Button
              onClick={handleClearCache}
              variant="outline"
              disabled={clearCache.isPending}
            >
              {clearCache.isPending ? 'Clearing...' : 'Clear Cache'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Cached Rates</p>
              <p className="text-2xl font-semibold text-gray-900">{cacheStats.keys || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cache Hits</p>
              <p className="text-2xl font-semibold text-green-600">{cacheStats.hits || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cache Misses</p>
              <p className="text-2xl font-semibold text-orange-600">{cacheStats.misses || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hit Rate</p>
              <p className="text-2xl font-semibold text-blue-600">
                {cacheStats.hits && cacheStats.misses
                  ? `${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (config) {
              setFormData({
                baseCurrency: config.base_currency || 'SRD',
                supportedCurrencies: config.supported_currencies || ['SRD', 'USD'],
                autoUpdateRates: config.auto_update_rates || false,
                rateUpdateFrequency: config.rate_update_frequency || 'daily',
                defaultRateSource: config.default_rate_source || 'manual',
                allowManualRates: config.allow_manual_rates !== false,
                requireRateApproval: config.require_rate_approval || false,
              });
              setHasChanges(false);
              setSaveMessage(null);
            }
          }}
          disabled={!hasChanges || updateConfig.isPending}
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateConfig.isPending}
        >
          {updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default CurrencyConfigPage;
