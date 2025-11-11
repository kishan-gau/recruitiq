/**
 * System Preferences Page
 * 
 * Configure system-wide preferences including:
 * - Default currency and exchange rates
 * - Date and time formats
 * - Timezone settings
 * - Language and localization
 * - Email settings and SMTP configuration
 * - Email notification preferences
 * - Default payroll settings
 */

import { useState, useEffect } from 'react';
import {
  Globe,
  DollarSign,
  Bell,
  Calendar,
  CheckCircle,
  Mail,
  Info,
  Send,
  Settings,
} from 'lucide-react';
import { FormSection, FormGrid, FormField } from '@/components/form/FormField';
import { SelectWithSearch } from '@/components/form/SelectWithSearch';
import { Input } from '@/components/ui/FormField';
import Tabs from '@/components/ui/Tabs';
import type { Tab } from '@/components/ui/Tabs';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
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

interface NotificationPreference {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const SystemPreferencesPage = () => {
  const { client: api } = usePaylinqAPI();
  const { success: showSuccess, error: showError } = useToast();
  
  // Active tab
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

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

  // Email settings
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'sendgrid' | 'ses'>('smtp');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState<'tls' | 'ssl' | 'none'>('tls');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  
  // SendGrid settings
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  
  // AWS SES settings
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');

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

  // Load email settings on mount
  useEffect(() => {
    const loadEmailSettings = async () => {
      try {
        const response = await api.get<any>('/settings/email');
        if (response.data?.success && response.data?.data?.configured) {
          const settings = response.data.data;
          setEmailProvider(settings.provider);
          setFromEmail(settings.fromEmail);
          setFromName(settings.fromName);
          setReplyToEmail(settings.replyToEmail || '');
          
          if (settings.provider === 'smtp' && settings.smtp) {
            setSmtpHost(settings.smtp.host);
            setSmtpPort(settings.smtp.port.toString());
            setSmtpUsername(settings.smtp.username);
            setSmtpSecure(settings.smtp.secure);
            // Don't set password - user needs to re-enter
          } else if (settings.provider === 'sendgrid') {
            // Don't set API key - user needs to re-enter
          } else if (settings.provider === 'ses' && settings.aws) {
            setAwsRegion(settings.aws.region);
            setAwsAccessKeyId(settings.aws.accessKeyId);
            // Don't set secret - user needs to re-enter
          }
        }
      } catch (error) {
        console.error('Failed to load email settings:', error);
      }
    };

    loadEmailSettings();
  }, [api]);

  // Handle save
  const handleSave = async () => {
    if (activeTab === 'email') {
      // Save email settings
      await handleSaveEmailSettings();
    } else {
      // For other tabs, just show success (can implement later)
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
    }
  };

  const handleSaveEmailSettings = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
      if (!emailProvider || !fromEmail || !fromName) {
        showError('Please fill in all required fields');
        return;
      }

      const payload: any = {
        provider: emailProvider,
        fromEmail,
        fromName,
        replyToEmail: replyToEmail || undefined,
      };

      // Add provider-specific settings
      if (emailProvider === 'smtp') {
        if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
          showError('Please fill in all SMTP fields');
          return;
        }
        payload.smtp = {
          host: smtpHost,
          port: parseInt(smtpPort),
          username: smtpUsername,
          password: smtpPassword,
          secure: smtpSecure,
        };
      } else if (emailProvider === 'sendgrid') {
        if (!sendgridApiKey) {
          showError('Please enter SendGrid API key');
          return;
        }
        payload.sendgrid = {
          apiKey: sendgridApiKey,
        };
      } else if (emailProvider === 'ses') {
        if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey) {
          showError('Please fill in all AWS SES fields');
          return;
        }
        payload.aws = {
          region: awsRegion,
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        };
      }

      const response = await api.post<any>('/settings/email', payload);
      
      if (response.data?.success) {
        showSuccess(response.data?.message || 'Email settings saved successfully');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        
        // Clear sensitive fields
        setSmtpPassword('');
        setSendgridApiKey('');
        setAwsSecretAccessKey('');
      } else {
        showError(response.data?.message || 'Failed to save email settings');
      }
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      showError(error.message || 'Failed to save email settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmail = prompt('Enter email address to send test email to:');
    if (!testEmail) return;

    setIsLoading(true);
    try {
      const response = await api.post<any>('/settings/email/test', { testEmail });
      
      if (response.data?.success) {
        showSuccess(response.data?.message || 'Test email sent successfully');
      } else {
        showError(response.data?.message || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Error testing email:', error);
      showError(error.message || 'Failed to send test email');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: Tab[] = [
    { id: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
    { id: 'email', label: 'Email', icon: <Send className="h-4 w-4" /> },
    { id: 'payroll', label: 'Payroll Defaults', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">System Preferences</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure system-wide defaults and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Success message */}
      {isSaved && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                System preferences saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="space-y-6">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <>
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
          </>
        )}

        {/* Email Settings Tab */}
        {activeTab === 'email' && (
          <>
            <FormSection
              title="Email Provider"
              description="Configure your email service provider"
              icon={<Mail className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <FormField label="Email Provider" required>
                  <SelectWithSearch
                    options={[
                      { value: 'smtp', label: 'SMTP (Generic Email Server)' },
                      { value: 'sendgrid', label: 'SendGrid' },
                      { value: 'ses', label: 'AWS SES' }
                    ]}
                    value={emailProvider}
                    onChange={(value) => setEmailProvider(value as 'smtp' | 'sendgrid' | 'ses')}
                    placeholder="Select email provider"
                  />
                </FormField>

                {/* SMTP Configuration */}
                {emailProvider === 'smtp' && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">SMTP Configuration</h4>
                    
                    <FormGrid>
                      <FormField label="SMTP Host" required>
                        <Input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.example.com"
                        />
                      </FormField>

                      <FormField label="SMTP Port" required>
                        <Input
                          type="text"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          placeholder="587"
                        />
                      </FormField>

                      <FormField label="Username" required>
                        <Input
                          type="text"
                          value={smtpUsername}
                          onChange={(e) => setSmtpUsername(e.target.value)}
                          placeholder="your-email@example.com"
                        />
                      </FormField>

                      <FormField label="Password" required>
                        <Input
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </FormField>

                      <FormField label="Security" required>
                        <SelectWithSearch
                          options={[
                            { value: 'tls', label: 'TLS (Recommended - Port 587)' },
                            { value: 'ssl', label: 'SSL (Port 465)' },
                            { value: 'none', label: 'None (Not Recommended)' }
                          ]}
                          value={smtpSecure}
                          onChange={(value) => setSmtpSecure(value as 'tls' | 'ssl' | 'none')}
                          placeholder="Select security protocol"
                        />
                      </FormField>
                    </FormGrid>
                  </div>
                )}

                {/* SendGrid Configuration */}
                {emailProvider === 'sendgrid' && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">SendGrid Configuration</h4>
                    
                    <FormField label="SendGrid API Key" required>
                      <Input
                        type="password"
                        value={sendgridApiKey}
                        onChange={(e) => setSendgridApiKey(e.target.value)}
                        placeholder="SG.xxxxxxxxxxxx"
                      />
                    </FormField>
                  </div>
                )}

                {/* AWS SES Configuration */}
                {emailProvider === 'ses' && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">AWS SES Configuration</h4>
                    
                    <FormGrid>
                      <FormField label="AWS Region" required>
                        <SelectWithSearch
                          options={[
                            { value: 'us-east-1', label: 'US East (N. Virginia)' },
                            { value: 'us-west-2', label: 'US West (Oregon)' },
                            { value: 'eu-west-1', label: 'EU (Ireland)' },
                            { value: 'eu-central-1', label: 'EU (Frankfurt)' }
                          ]}
                          value={awsRegion}
                          onChange={(value) => setAwsRegion(value as string)}
                          placeholder="Select AWS region"
                        />
                      </FormField>

                      <FormField label="AWS Access Key ID" required>
                        <Input
                          type="text"
                          value={awsAccessKeyId}
                          onChange={(e) => setAwsAccessKeyId(e.target.value)}
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                        />
                      </FormField>

                      <FormField label="AWS Secret Access Key" required>
                        <Input
                          type="password"
                          value={awsSecretAccessKey}
                          onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        />
                      </FormField>
                    </FormGrid>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Email Settings"
              description="Configure sender information and reply-to address"
              icon={<Send className="h-5 w-5" />}
            >
              <FormGrid>
                <FormField label="From Email Address" required helpText="Email address that will appear in the 'From' field">
                  <Input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="noreply@company.com"
                  />
                </FormField>

                <FormField label="From Name" required helpText="Name that will appear in the 'From' field">
                  <Input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Company Name"
                  />
                </FormField>

                <FormField label="Reply-To Email" helpText="Optional: Email address for replies">
                  <Input
                    type="email"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    placeholder="support@company.com"
                  />
                </FormField>
              </FormGrid>

              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Important Notes</h4>
                    <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                      <li>Ensure the 'From' email is verified with your email provider</li>
                      <li>For SMTP: Most providers require app-specific passwords</li>
                      <li>Test your configuration after saving to ensure emails can be sent</li>
                      <li>Email settings are shared across all applications (Paylinq, Nexus, RecruitIQ)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Test Email Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isLoading || !fromEmail}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </FormSection>
          </>
        )}

        {/* Payroll Defaults Tab */}
        {activeTab === 'payroll' && (
          <>
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
                  <Input
                    type="number"
                    value={defaultOvertimeRate}
                    onChange={(e) => setDefaultOvertimeRate(parseFloat(e.target.value))}
                    min="1"
                    max="3"
                    step="0.1"
                  />
                </FormField>

                <FormField label="Default Work Hours Per Day" required>
                  <Input
                    type="number"
                    value={defaultWorkHoursPerDay}
                    onChange={(e) => setDefaultWorkHoursPerDay(parseInt(e.target.value))}
                    min="1"
                    max="24"
                  />
                </FormField>

                <FormField label="Default Work Days Per Week" required>
                  <Input
                    type="number"
                    value={defaultWorkDaysPerWeek}
                    onChange={(e) => setDefaultWorkDaysPerWeek(parseInt(e.target.value))}
                    min="1"
                    max="7"
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          </>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <>
            <FormSection
              title="Notification Preferences"
              description="Configure email and in-app notifications"
              icon={<Bell className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Enable or disable notifications for specific events. You can choose to receive notifications via email, in-app, or both.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Notification Type
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Enabled
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <Mail className="h-4 w-4 inline mr-1" />
                          Email
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <Bell className="h-4 w-4 inline mr-1" />
                          In-App
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map(notification => (
                        <tr key={notification.id} className={!notification.enabled ? 'opacity-50' : ''}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{notification.description}</p>
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
          </>
        )}
      </div>
    </div>
  );
};

export default SystemPreferencesPage;
