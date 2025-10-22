import React from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'

export default function Jobs(){
  const { state } = useData()
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {state.jobs.reduce((s,j)=>s+j.openings,0)} open {state.jobs.reduce((s,j)=>s+j.openings,0) === 1 ? 'position' : 'positions'} across {state.jobs.length} {state.jobs.length === 1 ? 'role' : 'roles'}
          </div>
        </div>
        <Link 
          to="/jobs/new" 
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          Post a job
        </Link>
      </div>

      <div className="grid gap-3">
        {state.jobs.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No jobs posted yet
          </div>
        )}
        {state.jobs.map(j=> (
          <Link 
            key={j.id} 
            to={`/jobs/${j.id}`} 
            className="group p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-transparent dark:border-slate-700/50 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 flex flex-col md:flex-row md:justify-between md:items-center transition-all duration-200"
          >
            <div className="flex-1">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{j.title}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>{j.location}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>{j.type}</span>
              </div>
            </div>
            <div className="mt-3 md:mt-0 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{j.openings}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{j.openings === 1 ? 'opening' : 'openings'}</div>
              </div>
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                View details
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


