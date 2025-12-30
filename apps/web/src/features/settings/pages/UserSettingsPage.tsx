import { User, Bell, Shield, Palette } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@recruitiq/auth';

type SettingsTab = 'profile' | 'preferences' | 'security' | 'notifications';

export default function UserSettingsPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Please log in to access settings.</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
    { id: 'preferences' as SettingsTab, label: 'Preferences', icon: Palette },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab Navigation */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            <div className="bg-card border border-border rounded-lg p-6">
              {activeTab === 'profile' && <ProfileTab user={user} />}
              {activeTab === 'preferences' && <PreferencesTab />}
              {activeTab === 'security' && <SecurityTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileTabProps {
  user: any; // Use proper User type from @recruitiq/auth
}

function ProfileTab({ user }: ProfileTabProps) {
  const initials = user.firstName && user.lastName
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Profile Information</h2>
        <p className="text-sm text-muted-foreground">
          Update your personal information and profile picture
        </p>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center gap-6 pb-6 border-b border-border">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-2xl">{initials}</span>
        </div>
        <div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            Change Photo
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG or GIF. Max size 2MB.
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              First Name
            </label>
            <input
              type="text"
              defaultValue={user.firstName || ''}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Last Name
            </label>
            <input
              type="text"
              defaultValue={user.lastName || ''}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <input
            type="email"
            defaultValue={user.email || ''}
            disabled
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Contact support to change your email address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            defaultValue={user.phone || ''}
            placeholder="+1 (555) 123-4567"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Bio
          </label>
          <textarea
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function PreferencesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Customize your application experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div className="pb-6 border-b border-border">
          <label className="block text-sm font-medium text-foreground mb-3">
            Theme
          </label>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
              <span className="w-4 h-4 bg-white rounded-full" />
              Light
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 transition-colors font-medium">
              <span className="w-4 h-4 bg-gray-900 rounded-full" />
              Dark
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 transition-colors font-medium">
              <span className="w-4 h-4 bg-gradient-to-r from-gray-900 to-white rounded-full" />
              System
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="pb-6 border-b border-border">
          <label className="block text-sm font-medium text-foreground mb-2">
            Language
          </label>
          <select className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </div>

        {/* Timezone */}
        <div className="pb-6 border-b border-border">
          <label className="block text-sm font-medium text-foreground mb-2">
            Timezone
          </label>
          <select className="w-full md:w-96 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>(GMT-05:00) Eastern Time (US & Canada)</option>
            <option>(GMT-06:00) Central Time (US & Canada)</option>
            <option>(GMT-07:00) Mountain Time (US & Canada)</option>
            <option>(GMT-08:00) Pacific Time (US & Canada)</option>
          </select>
        </div>

        {/* Date Format */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Date Format
          </label>
          <select className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>MM/DD/YYYY</option>
            <option>DD/MM/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your password and security settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Change Password */}
        <div className="pb-6 border-b border-border">
          <h3 className="text-sm font-medium text-foreground mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Current Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
              Update Password
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="pb-6 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        </div>

        {/* Active Sessions */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-4">Active Sessions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Current Session</p>
                <p className="text-xs text-muted-foreground">Windows • Chrome • New York, US</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">iPhone</p>
                <p className="text-xs text-muted-foreground">Safari • Last active 2 hours ago</p>
              </div>
              <button className="text-xs text-destructive hover:underline font-medium">
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choose what notifications you want to receive
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="pb-6 border-b border-border">
          <h3 className="text-sm font-medium text-foreground mb-4">Email Notifications</h3>
          <div className="space-y-4">
            {[
              { label: 'New Applications', description: 'Get notified when new applications are submitted' },
              { label: 'Interview Schedules', description: 'Receive updates about scheduled interviews' },
              { label: 'System Updates', description: 'Important updates about the platform' },
              { label: 'Weekly Summary', description: 'Weekly report of your recruitment activity' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-4">Push Notifications</h3>
          <div className="space-y-4">
            {[
              { label: 'Desktop Notifications', description: 'Show notifications on your desktop' },
              { label: 'Mobile Notifications', description: 'Receive push notifications on your mobile device' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
          Save Notification Settings
        </button>
      </div>
    </div>
  );
}
