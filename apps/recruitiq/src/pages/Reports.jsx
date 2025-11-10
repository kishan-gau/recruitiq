import React from 'react'
import { Icon } from '../components/icons'

export default function Reports() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Reports & Analytics
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          View hiring metrics, performance data, and insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Icon name="chart" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Hiring Pipeline</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Track candidate progress through your hiring stages
          </p>
          <button className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            View Report →
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Icon name="clock" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Time to Hire</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Analyze hiring speed and bottlenecks
          </p>
          <button className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            View Report →
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Icon name="users" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Source Quality</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Compare candidate sources and quality metrics
          </p>
          <button className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            View Report →
          </button>
        </div>
      </div>

      <div className="mt-8 bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
        <Icon name="chart" className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Reports Coming Soon
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Advanced analytics and reporting features are under development. 
          Stay tuned for detailed insights into your hiring process.
        </p>
      </div>
    </div>
  )
}
