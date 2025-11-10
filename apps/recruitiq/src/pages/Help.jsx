import React from 'react'
import { Icon } from '../components/icons'

export default function Help() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Help & Support
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Get help with RecruitIQ and learn how to make the most of the platform
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-left">
          <Icon name="search" className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Search Docs</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Find answers in our documentation
          </p>
        </button>

        <button className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left">
          <Icon name="help" className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Contact Support</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Get help from our support team
          </p>
        </button>

        <button className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left">
          <Icon name="info" className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">What's New</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Latest features and updates
          </p>
        </button>
      </div>

      {/* Help topics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Popular Topics
        </h2>
        <div className="space-y-3">
          <a href="#" className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="briefcase" className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Creating and managing job postings</span>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </a>

          <a href="#" className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="users" className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Managing candidates and applications</span>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </a>

          <a href="#" className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="calendar" className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Scheduling interviews</span>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </a>

          <a href="#" className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="kanban" className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Using the pipeline view</span>
            </div>
            <Icon name="chevron-down" className="w-5 h-5 text-slate-400 -rotate-90" />
          </a>
        </div>
      </div>

      {/* Resources */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
        <Icon name="help" className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Need More Help?
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
          Our support team is here to help you with any questions or issues.
        </p>
        <div className="flex gap-3 justify-center">
          <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
            Contact Support
          </button>
          <button className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium border border-slate-300 dark:border-slate-600 transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </div>
  )
}
