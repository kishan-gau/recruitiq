import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Icon } from './icons'
import RecentActivitySummary from './RecentActivitySummary'
import { Link } from 'react-router-dom'

export default function MobileDashboardSummary(){
  const { state } = useData()
  const navigate = useNavigate()

  const openRoles = state.jobs.length
  const candidates = state.candidates.length
  const hires = state.hires || 0

  return (
    <div className="md:hidden px-4">
      <div className="flex flex-col gap-3 pt-3">
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded p-2 shadow-sm">
            <div className="text-xs text-slate-500">Open roles</div>
            <div className="text-2xl font-semibold">{openRoles}</div>
          </div>
          <div className="flex-1 bg-white rounded p-2 shadow-sm">
            <div className="text-xs text-slate-500">Candidates</div>
            <div className="text-2xl font-semibold">{candidates}</div>
          </div>
        </div>

        <RecentActivitySummary />

        <div className="bg-white rounded p-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500">Quick actions</div>
            <Link to="/mobile/quick-results" className="text-xs text-slate-400">Search</Link>
          </div>
          <div className="flex gap-2">
            <button onClick={()=> navigate('/jobs/new')} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded"> <Icon name="plus" className="w-4 h-4" /> <span className="text-sm">New job</span></button>
            <button onClick={()=> navigate('/candidates/new')} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 rounded"> <Icon name="users" className="w-4 h-4" /> <span className="text-sm">Add candidate</span></button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pb-12">Tap any card to open details</div>
      </div>
    </div>
  )
}
