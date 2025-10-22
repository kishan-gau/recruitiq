import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'

export default function JobDetail(){
  const { id } = useParams()
  const { state } = useData()
  const job = state.jobs.find(j=> String(j.id) === id)
  if(!job) return <div className="p-6 text-slate-500 dark:text-slate-400">Job not found</div>
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{job.title}</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <span>{job.location}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{job.type}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{job.openings} {job.openings === 1 ? 'opening' : 'openings'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to={`/jobs/${job.id}/edit`} className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded shadow-sm hover:shadow transition-all duration-200 text-center">Edit</Link>
          <button className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200">Post</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
          <h2 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">Description</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{job.description}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
          <h2 className="font-semibold mb-3 text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Candidates</span>
            <span className="text-xs font-normal px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
              {state.candidates.filter(c=> c.jobId === job.id).length}
            </span>
          </h2>
          <div className="space-y-2">
            {state.candidates.filter(c=> c.jobId === job.id).length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No candidates yet
              </div>
            )}
            {state.candidates.filter(c=> c.jobId === job.id).map(c=> (
              <div key={c.id} className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 flex items-center justify-between transition-all duration-200">
                <Link to={`/candidates/${c.id}`} className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.stage}</div>
                </Link>
                <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded ml-2">{c.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
