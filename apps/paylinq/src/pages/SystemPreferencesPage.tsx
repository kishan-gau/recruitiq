/**
 * System Preferences Page
 * 
 * Configure system-wide preferences including:
 * - Default currency and exchange rates
 * - Date and time formats
 * - Timezone settings
 * - Language and localization
 * - Email notification preferences
 * - Default payroll settings
 */

import { useState } from 'react';
import {
  Globe,
  DollarSign,
  Bell,
  Calendar,
  CheckCircle,
  Mail,
  Info,
} from 'lucide-react';
import { FormSection, FormGrid, FormField } from '../components/form/FormField';
import { SelectWithSearch } from '../components/form/SelectWithSearch';

type Currency = 'SRD' | 'USD' | 'EUR';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type TimeFormat = '12h' | '24h';
type Language = 'en' | 'nl' | 'es';

interface ExchangeRate {
  currency: Currency;
  rate: number;
  lastUpdated: string;
}

interface NotificationPreference {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const SystemPreferencesPage = () => {
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

  // Payroll defaults
  const [defaultPayFrequency, setDefaultPayFrequency] = useState('bi-weekly');
  const [defaultOvertimeRate, setDefaultOvertimeRate] = useState(1.5);
  const [defaultWorkHoursPerDay, setDefaultWorkHoursPerDay] = useState(8);
  const [defaultWorkDaysPerWeek, setDefaultWorkDaysPerWeek] = useState(5);

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreference[]>([
    {
      id: '1',
      name: 'Payroll Run Completion',
      description: 'Notify when a payroll run is completed',
      enabled: true,
      emailEnabled: true,
      inAppEnabled: true,
    },
    {
      id: '2',
      name: 'Timesheet Submission',
      description: 'Notify when a timesheet is submitted for approval',
      enabled: true,
      emailEnabled: false,
      inAppEnabled: true,
    },
    {
      id: '3',
      name: 'Payment Processing',
      description: 'Notify when payments are processed',
      enabled: true,
      emailEnabled: true,
      inAppEnabled: true,
    },
    {
      id: '4',
      name: 'System Errors',
      description: 'Notify when system errors occur',
      enabled: true,
      emailEnabled: true,
      inAppEnabled: true,
    },
    {
      id: '5',
      name: 'Weekly Summary',
      description: 'Receive weekly payroll activity summary',
      enabled: false,
      emailEnabled: false,
      inAppEnabled: false,
    },
  ]);

  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Currency options
  const currencyOptions = [
    { value: 'SRD', label: 'SRD - Surinamese Dollar' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
  ];

  // Timezone options (common timezones)
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

  // Pay frequency options
  const payFrequencyOptions = [
    { value: 'weekly', label: 'Weekly (52 pay periods)' },
    { value: 'bi-weekly', label: 'Bi-weekly (26 pay periods)' },
    { value: 'semi-monthly', label: 'Semi-monthly (24 pay periods)' },
    { value: 'monthly', label: 'Monthly (12 pay periods)' },
  ];

  // Toggle notification
  const toggleNotification = (id: string, field: 'enabled' | 'emailEnabled' | 'inAppEnabled') => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, [field]: !n[field] } : n
    ));
  };

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

  // Handle save
  const handleSave = () => {
    console.log('Saving system preferences:', {
      defaultCurrency,
      exchangeRates,
      dateFormat,
      timeFormat,
      timezone,
      language,
      defaultPayFrequency,
      defaultOvertimeRate,
      defaultWorkHoursPerDay,
      defaultWorkDaysPerWeek,
      notifications,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Preferences</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system-wide defaults and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Save Preferences
        </button>
      </div>

      {/* Success message */}
      {isSaved && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                System preferences saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700">
                Exchange Rates (1 {defaultCurrency} =)
              </label>
              <div className="space-y-2">
                {exchangeRates.map(rate => (
                  <div
                    key={rate.currency}
                    className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900 w-12">
                      {rate.currency}
                    </span>
                    <input
                      type="number"
                      value={rate.rate}
                      onChange={(e) => updateExchangeRate(rate.currency, parseFloat(e.target.value))}
                      className="block w-32 rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      step="0.001"
                      min="0"
                    />
                    <span className="text-xs text-gray-500">
                      Updated: {new Date(rate.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        {/* Regional Settings */}
        <FormSection
          title="Regional Settings"
          description="Configure date, time, and language preferences"
          icon={<Globe className="h-5 w-5" />}
        >
          <FormGrid>
            <FormField label="Date Format" required>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Preview: {formatDateExample(dateFormat)}
              </p>
            </FormField>

            <FormField label="Time Format" required>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
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

        {/* Payroll Defaults */}
        <FormSection
          title="Payroll Defaults"
          description="Configure default payroll settings for new employees"
          icon={<Calendar className="h-5 w-5" />}
        >
          <FormGrid>
            <FormField label="Default Pay Frequency" required>
              <SelectWithSearch
                options={payFrequencyOptions}
                value={defaultPayFrequency}
                onChange={(value) => setDefaultPayFrequency(value as string)}
                placeholder="Select pay frequency"
              />
            </FormField>

            <FormField label="Default Overtime Rate" required helpText="Multiplier (e.g., 1.5 = 150%)">
              <input
                type="number"
                value={defaultOvertimeRate}
                onChange={(e) => setDefaultOvertimeRate(parseFloat(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                min="1"
                max="3"
                step="0.1"
              />
            </FormField>

            <FormField label="Default Work Hours Per Day" required>
              <input
                type="number"
                value={defaultWorkHoursPerDay}
                onChange={(e) => setDefaultWorkHoursPerDay(parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                min="1"
                max="24"
              />
            </FormField>

            <FormField label="Default Work Days Per Week" required>
              <input
                type="number"
                value={defaultWorkDaysPerWeek}
                onChange={(e) => setDefaultWorkDaysPerWeek(parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                min="1"
                max="7"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Notification Preferences */}
        <FormSection
          title="Notification Preferences"
          description="Configure email and in-app notifications"
          icon={<Bell className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Enable or disable notifications for specific events. You can choose to receive notifications via email, in-app, or both.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notification Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enabled
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Bell className="h-4 w-4 inline mr-1" />
                      In-App
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map(notification => (
                    <tr key={notification.id} className={!notification.enabled ? 'opacity-50' : ''}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{notification.name}</p>
                          <p className="text-xs text-gray-500">{notification.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={notification.enabled}
                          onChange={() => toggleNotification(notification.id, 'enabled')}
                          className="h-4 w-4 text-blue-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={notification.emailEnabled}
                          onChange={() => toggleNotification(notification.id, 'emailEnabled')}
                          disabled={!notification.enabled}
                          className="h-4 w-4 text-blue-600 focus:ring-emerald-500 border-gray-300 rounded disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={notification.inAppEnabled}
                          onChange={() => toggleNotification(notification.id, 'inAppEnabled')}
                          disabled={!notification.enabled}
                          className="h-4 w-4 text-blue-600 focus:ring-emerald-500 border-gray-300 rounded disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
};

export default SystemPreferencesPage;


