import React from 'react'
import { Icon } from '../components/icons'

export default function Settings() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your account, team, and application preferences
        </p>
      </div>

      <div className="space-y-4">
        {/* Settings sections */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Icon name="user" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Profile</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Update your personal information and preferences
                </p>
              </div>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Icon name="users" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Team</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manage team members and permissions
                </p>
              </div>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Icon name="briefcase" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Organization</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure company details and branding
                </p>
              </div>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Icon name="settings" className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Integrations</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Connect with third-party tools and services
                </p>
              </div>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="mt-8 bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
        <Icon name="settings" className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Settings Panel Coming Soon
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Comprehensive settings management is under development. 
          For now, you can access your profile settings from the user menu.
        </p>
      </div>
    </div>
  )
}
