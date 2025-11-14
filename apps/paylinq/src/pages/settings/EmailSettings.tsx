/**
 * Email Settings Page
 * 
 * Configure email service provider and settings:
 * - SMTP configuration
 * - SendGrid API
 * - AWS SES
 * - Sender information
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Send,
  Info,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { FormSection, FormGrid, FormField } from '@/components/form/FormField';
import { SelectWithSearch } from '@/components/form/SelectWithSearch';
import { Input } from '@/components/ui/FormField';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

export default function EmailSettings() {
  const { client: api } = usePaylinqAPI();
  const { success: showSuccess, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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
          } else if (settings.provider === 'ses' && settings.aws) {
            setAwsRegion(settings.aws.region);
            setAwsAccessKeyId(settings.aws.accessKeyId);
          }
        }
      } catch (error) {
        console.error('Failed to load email settings:', error);
      }
    };

    loadEmailSettings();
  }, [api]);

  const handleSave = async () => {
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
              Email Configuration
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure your email service provider and sender settings
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Settings'}
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
                Email settings saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Provider */}
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

      {/* Email Settings */}
      <FormSection
        title="Sender Information"
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
    </div>
  );
}
