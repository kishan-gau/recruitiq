import React from 'react'
import { useData } from '../context/DataContext'
import { tokenScore } from '../utils/searchUtils'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../utils/telemetry'
import { Icon } from './icons'

export default function DashboardQuickResults({query=''}){
  const { state } = useData()
  const navigate = useNavigate()
  const [q, setQ] = React.useState((query||'').trim())
  const [pinned, setPinned] = React.useState(()=>{
    try{ return JSON.parse(localStorage.getItem('recruitiq_pinned_searches')||'[]') }catch(e){ return [] }
  })
  const [showSaveModal, setShowSaveModal] = React.useState(false)
  const [pinName, setPinName] = React.useState('')
  const [showPins, setShowPins] = React.useState(false)

  const candidates = React.useMemo(()=>{
    const qq = (q||'').trim().toLowerCase()
    if(!qq) return state.candidates.slice(0,3)
    const tokens = qq.split(/\s+/).filter(Boolean)
    return state.candidates.map(c=> ({...c, score: tokenScore(c.name, tokens) + tokenScore(c.title||'', tokens)})).filter(c=> c.score>0).sort((a,b)=> b.score-a.score).slice(0,3)
  },[q, state.candidates])

  const jobs = React.useMemo(()=>{
    const qq = (q||'').trim().toLowerCase()
    if(!qq) return state.jobs.slice(0,3)
    const tokens = qq.split(/\s+/).filter(Boolean)
    return state.jobs.map(j=> ({...j, score: tokenScore(j.title, tokens) + tokenScore(j.description||'', tokens)})).filter(j=> j.score>0).sort((a,b)=> b.score-a.score).slice(0,3)
  },[q, state.jobs])

  return (
    <div>
      <div className="font-semibold mb-2">Quick results</div>
      <div className="text-sm text-slate-500 mb-2">Top matches and suggested actions</div>

      <div className="mb-3 relative">
        <div className="flex items-stretch gap-2 mb-2">
          <input id="dashboard-quick-search" value={q} onChange={e=>{ setQ(e.target.value); trackEvent('dashboard.search.query', {q: e.target.value}) }} placeholder="Quick search..." className="w-full border border-slate-300 dark:border-slate-600 px-3 h-10 py-0 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" onFocus={()=> setShowPins(true)} />
          <button aria-label="Save search" title="Save search" onClick={()=> setShowSaveModal(true)} className="ml-2 flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 h-10 py-0 rounded shadow-sm text-sm focus-ring self-stretch leading-none" data-testid="save-query-btn">
            <Icon name="save" className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
        {/* Inline pin name and save removed; saving is done via the save icon/modal */}
        {showPins && (
          <div className="mt-2 mb-2" data-testid="pinned-list">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pinned.map((p)=> (
                <div key={p.name} className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1 border rounded-full bg-white max-w-[160px]" role="group">
                  <button onClick={()=>{ setQ(p.query); trackEvent('dashboard.search.pin.open', {name: p.name}) }} className="text-left text-sm truncate">{p.name}</button>
                  <button aria-label={`Delete ${p.name}`} title="Delete" onClick={()=>{ const next = pinned.filter(x=> x.name !== p.name); setPinned(next); try{ localStorage.setItem('recruitiq_pinned_searches', JSON.stringify(next)) }catch(e){}; trackEvent('dashboard.search.pin.delete', { name: p.name }) }} className="text-red-500 text-sm" data-testid={`delete-pin-${p.name}`}>✖</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showSaveModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50" data-testid="save-modal">
            <div className="bg-white p-4 rounded w-80">
              <div className="font-semibold mb-2">Save search</div>
              <div className="mb-2">
                <input placeholder="Name" value={pinName} onChange={e=> setPinName(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 px-2 py-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=> setShowSaveModal(false)} className="px-3 py-1 rounded bg-slate-100">Cancel</button>
                <button onClick={()=>{ const name = (pinName||'').trim(); if(!name || !q) return; const next = [{name, query: q}, ...pinned.filter(p=> p.name !== name)].slice(0,6); setPinned(next); try{ localStorage.setItem('recruitiq_pinned_searches', JSON.stringify(next)) }catch(e){}; setPinName(''); setShowSaveModal(false); trackEvent('dashboard.search.pin', {name, q}) }} className="px-3 py-1 bg-emerald-500 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400">Candidates</div>
        {candidates.length === 0 ? <div className="text-sm text-slate-500">No candidates</div> : (
          candidates.map(c=> (
            <div key={c.id} className="py-2 border-b last:border-b-0 cursor-pointer" onClick={()=> navigate(`/candidates/${c.id}`)}>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-slate-500">{c.title} • {c.location}</div>
            </div>
          ))
        )}
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400">Jobs</div>
        {jobs.length === 0 ? <div className="text-sm text-slate-500">No jobs</div> : (
          jobs.map(j=> (
            <div key={j.id} className="py-2 border-b last:border-b-0 cursor-pointer" onClick={()=> navigate(`/jobs/${j.id}`)}>
              <div className="font-medium">{j.title}</div>
              <div className="text-xs text-slate-500">{j.location} • {j.type}</div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={()=>{ trackEvent('dashboard.action.new_job'); navigate('/jobs/new') }} className="px-3 py-1 bg-emerald-500 text-white rounded text-sm">New Job</button>
        <button onClick={()=>{ trackEvent('dashboard.action.add_candidate'); navigate('/candidates/new') }} className="px-3 py-1 bg-slate-100 rounded text-sm">Add candidate</button>
        <button onClick={()=>{ trackEvent('dashboard.action.pipeline'); navigate('/pipeline') }} className="px-3 py-1 bg-slate-100 rounded text-sm">Go to pipeline</button>
      </div>
    </div>
  )
}
