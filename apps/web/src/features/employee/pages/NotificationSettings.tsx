import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';

import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '@/services/pushNotifications';

/**
 * Notification Settings Page
 * Allows employees to manage push notification preferences
 * 
 * Features:
 * - Enable/disable push notifications
 * - Granular notification type preferences
 * - Permission status display
 * - Test notification button
 * 
 * From PWA Proposal Phase 3: Push Notifications
 */
export default function NotificationSettings() {
  const [isSupported] = useState(isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    loadNotificationPreferences()
  );

  // Load notification status on mount
  useEffect(() => {
    setPermission(getNotificationPermission());
    
    // Check subscription status
    if (isSupported) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, [isSupported]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Notification Settings</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Push notifications are not supported in your browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </h1>
        <p className="text-sm opacity-90 mt-1">
          Manage your push notifications
        </p>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Permission Status */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Push Notifications</h2>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' 
                  ? 'Notifications are enabled'
                  : permission === 'denied'
                  ? 'Notifications are blocked'
                  : 'Enable notifications to stay updated'
                }
              </p>
            </div>
            <div className={`
              flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
              ${permission === 'granted'
                ? 'bg-green-100 text-green-700'
                : permission === 'denied'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
              }
            `}>
              {permission === 'granted' ? (
                <>
                  <Check className="h-3 w-3" />
                  Enabled
                </>
              ) : permission === 'denied' ? (
                <>
                  <X className="h-3 w-3" />
                  Blocked
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3" />
                  Disabled
                </>
              )}
            </div>
          </div>

          {/* Enable/Disable Button */}
          {permission !== 'denied' && (
            <button
              onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
              disabled={isLoading}
              className={`
                w-full py-3 rounded-lg font-medium touch-manipulation
                transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${isSubscribed
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }
              `}
            >
              {isLoading 
                ? 'Processing...' 
                : isSubscribed 
                  ? 'Disable Notifications' 
                  : 'Enable Notifications'
              }
            </button>
          )}

          {permission === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <p className="font-medium mb-1">Notifications Blocked</p>
              <p>
                You've blocked notifications for this site. To enable them, please update your browser settings.
              </p>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        {isSubscribed && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Notification Types</h2>
            <div className="space-y-4">
              <PreferenceToggle
                title="Schedule Reminders"
                description="Get notified about upcoming shifts"
                checked={preferences.scheduleReminders}
                onChange={(checked) => handlePreferenceChange('scheduleReminders', checked)}
              />
              <PreferenceToggle
                title="Payroll Updates"
                description="Notifications when payslips are available"
                checked={preferences.payrollUpdates}
                onChange={(checked) => handlePreferenceChange('payrollUpdates', checked)}
              />
              <PreferenceToggle
                title="HR Announcements"
                description="Important company announcements"
                checked={preferences.hrAnnouncements}
                onChange={(checked) => handlePreferenceChange('hrAnnouncements', checked)}
              />
              <PreferenceToggle
                title="Action Required"
                description="Alerts when your action is needed"
                checked={preferences.actionRequired}
                onChange={(checked) => handlePreferenceChange('actionRequired', checked)}
              />
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> You can customize which types of notifications you receive above. 
            All notifications will respect your device's Do Not Disturb settings.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Preference Toggle Component
 */
interface PreferenceToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PreferenceToggle({ title, description, checked, onChange }: PreferenceToggleProps) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative flex-shrink-0 w-12 h-6 rounded-full transition-colors
          touch-manipulation ml-4
          ${checked ? 'bg-primary' : 'bg-muted'}
        `}
        aria-label={`Toggle ${title}`}
      >
        <span
          className={`
            absolute top-1 left-1 w-4 h-4 bg-white rounded-full
            transition-transform shadow-sm
            ${checked ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
