/**
 * Notification Settings Page
 * 
 * Configure notification preferences:
 * - Email notifications
 * - In-app notifications
 * - Event-specific preferences
 */

import {
  Bell,
  Mail,
  CheckCircle,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { FormSection } from '@recruitiq/ui';

import { useToast } from '@/contexts/ToastContext';

interface NotificationPreference {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

export default function NotificationSettings() {
  const { success: showSuccess } = useToast();
  const [isSaved, setIsSaved] = useState(false);

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

  // Toggle notification
  const toggleNotification = (id: string, field: 'enabled' | 'emailEnabled' | 'inAppEnabled') => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, [field]: !n[field] } : n
    ));
  };

  const handleSave = () => {
    console.log('Saving notification settings:', notifications);
    setIsSaved(true);
    showSuccess('Notification settings saved successfully');
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
              Notification Preferences
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure email and in-app notification preferences
            </p>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Settings
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
                Notification settings saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
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
    </div>
  );
}
