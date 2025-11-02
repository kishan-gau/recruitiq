import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MFASetup from '../components/MFASetup';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('security');

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔒 Security
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔔 Notifications
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
              <p className="text-sm text-gray-600 mb-6">
                Manage your account security and authentication methods.
              </p>
            </div>

            {/* MFA Setup */}
            <MFASetup />

            {/* Password Change Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
              <p className="text-sm text-gray-600 mb-4">
                Update your password to keep your account secure.
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Change Password
              </button>
            </div>

            {/* Active Sessions Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
              <p className="text-sm text-gray-600 mb-4">
                View and manage your active login sessions.
              </p>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition">
                View Sessions
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role?.replace('_', ' ') || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500 capitalize"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure how and when you receive notifications.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                <span className="text-sm text-gray-700">Email notifications for security events</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                <span className="text-sm text-gray-700">License expiration reminders</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">Weekly activity reports</span>
              </label>
            </div>

            <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              Save Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
