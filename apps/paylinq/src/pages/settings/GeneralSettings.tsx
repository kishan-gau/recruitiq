/**
 * General Settings Page
 * 
 * Configure system-wide settings:
 * - Default currency and exchange rates
 * - Date and time formats
 * - Timezone settings
 * - Language and localization
 */

import { useState } from 'react';
import { Globe, DollarSign, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FormSection, FormGrid, FormField } from '@/components/form/FormField';
import { SelectWithSearch } from '@/components/form/SelectWithSearch';
import { Input } from '@/components/ui/FormField';
import { useToast } from '@/contexts/ToastContext';

type Currency = 'SRD' | 'USD' | 'EUR';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type TimeFormat = '12h' | '24h';
type Language = 'en' | 'nl' | 'es';

interface ExchangeRate {
  currency: Currency;
  rate: number;
  lastUpdated: string;
}

export default function GeneralSettings() {
  const { success: showSuccess } = useToast();
  const [isSaved, setIsSaved] = useState(false);

  // Currency settings
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('SRD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([
    { currency: 'USD', rate: 0.05, lastUpdated: new Date().toISOString() },
    { currency: 'EUR', rate: 0.046, lastUpdated: new Date().toISOString() },
  ]);

  // Regional settings
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');
  const [timezone, setTimezone] = useState('America/Paramaribo');
  const [language, setLanguage] = useState<Language>('en');

  // Currency options
  const currencyOptions = [
    { value: 'SRD', label: 'SRD - Surinamese Dollar' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
  ];

  // Timezone options
  const timezoneOptions = [
    { value: 'America/Paramaribo', label: 'America/Paramaribo (GMT-3)' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  ];

  // Language options
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'nl', label: 'Nederlands (Dutch)' },
    { value: 'es', label: 'Español (Spanish)' },
  ];

  // Update exchange rate
  const updateExchangeRate = (currency: Currency, newRate: number) => {
    setExchangeRates(exchangeRates.map(rate =>
      rate.currency === currency
        ? { ...rate, rate: newRate, lastUpdated: new Date().toISOString() }
        : rate
    ));
  };

  // Format date example
  const formatDateExample = (format: DateFormat): string => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
    }
  };

  // Format time example
  const formatTimeExample = (format: TimeFormat): string => {
    const date = new Date();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (format === '12h') {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  };

  const handleSave = () => {
    console.log('Saving general settings:', {
      defaultCurrency,
      exchangeRates,
      dateFormat,
      timeFormat,
      timezone,
      language,
    });
    setIsSaved(true);
    showSuccess('General settings saved successfully');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              General Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure system-wide defaults and preferences
            </p>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Success message */}
      {isSaved && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                General settings saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Currency Settings */}
      <FormSection
        title="Currency & Exchange Rates"
        description="Configure default currency and exchange rates"
        icon={<DollarSign className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <FormField label="Default Currency" required>
            <SelectWithSearch
              options={currencyOptions}
              value={defaultCurrency}
              onChange={(value) => setDefaultCurrency(value as Currency)}
              placeholder="Select currency"
            />
          </FormField>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Exchange Rates (1 {defaultCurrency} =)
            </label>
            <div className="space-y-3">
              {exchangeRates.map(rate => (
                <div
                  key={rate.currency}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {rate.currency}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Exchange Rate
                    </label>
                    <Input
                      type="number"
                      value={rate.rate}
                      onChange={(e) => updateExchangeRate(rate.currency, parseFloat(e.target.value))}
                      step="0.001"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Updated: {new Date(rate.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

      {/* Regional Settings */}
      <FormSection
        title="Regional Settings"
        description="Configure date, time, timezone, and language preferences"
        icon={<Globe className="h-5 w-5" />}
      >
        <FormGrid>
          <FormField label="Date Format" required>
            <SelectWithSearch
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
              ]}
              value={dateFormat}
              onChange={(value) => setDateFormat(value as DateFormat)}
              placeholder="Select date format"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Preview: {formatDateExample(dateFormat)}
            </p>
          </FormField>

          <FormField label="Time Format" required>
            <SelectWithSearch
              options={[
                { value: '12h', label: '12-hour (AM/PM)' },
                { value: '24h', label: '24-hour' }
              ]}
              value={timeFormat}
              onChange={(value) => setTimeFormat(value as TimeFormat)}
              placeholder="Select time format"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Preview: {formatTimeExample(timeFormat)}
            </p>
          </FormField>

          <FormField label="Timezone" required>
            <SelectWithSearch
              options={timezoneOptions}
              value={timezone}
              onChange={(value) => setTimezone(value as string)}
              placeholder="Select timezone"
            />
          </FormField>

          <FormField label="Language" required>
            <SelectWithSearch
              options={languageOptions}
              value={language}
              onChange={(value) => setLanguage(value as Language)}
              placeholder="Select language"
            />
          </FormField>
        </FormGrid>
      </FormSection>
    </div>
  );
}
