import React from 'react'
import { useData } from '../context/DataContext'
import DashboardQuickResults from '../components/DashboardQuickResults'
import MobileDashboardSummary from '../components/MobileDashboardSummary'

export default function Dashboard(){
  const { state } = useData()
  return (
    <div>
      {/* Mobile summary: replace full dashboard with compact summary on small screens */}
      <MobileDashboardSummary />

      {/* Desktop/dashboard content (hidden on small screens) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">Summary of hiring activity</div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded shadow-sm hover:shadow transition-all duration-200">Share</button>
          <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200">New Job</button>
        </div>
      </div>

  <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Open roles</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{state.jobs.reduce((s,j)=>s+j.openings,0)}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Candidates</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{state.candidates.length}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Hires</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{state.candidates.filter(c=> c.stage==='Hired').length}</div>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
          <div className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Recent activity</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">No activity yet — move candidates through stages to populate this feed.</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
          <DashboardQuickResults />
        </div>
      </div>
    </div>
  )
}
