import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import CandidateForm from '../components/CandidateForm'
import { Icon } from '../components/icons'

const STAGES = ['Applied','Phone Screen','Interview','Offer','Hired']

// Stage color mapping for visual feedback
const STAGE_COLORS = {
  'Applied': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Phone Screen': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Offer': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Hired': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
}

export default function Candidates(){
  const { state, setState } = useData()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(()=> {
    const qq = q.trim().toLowerCase()
    return state.candidates.filter(c=> !qq || c.name.toLowerCase().includes(qq) || c.title.toLowerCase().includes(qq))
  },[q, state.candidates])

  function moveStage(id, dir){
    setState(s=>{
      const candidates = s.candidates.map(c=>{
        if(c.id !== id) return c
        const idx = STAGES.indexOf(c.stage)
        const nidx = Math.max(0, Math.min(STAGES.length-1, idx + dir))
        return {...c, stage: STAGES[nidx]}
      })
      return {...s, candidates}
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'person' : 'people'} in your pipeline
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
              placeholder="Search candidates..." 
              className="border dark:border-slate-700 pl-10 pr-3 py-2 rounded w-full sm:w-64 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
            />
          </div>
          <button 
            onClick={()=>setOpen(true)} 
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
          >
            Add candidate
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            {q.trim() ? 'No candidates match your search' : 'No candidates yet'}
          </div>
        )}
        {filtered.map(c=> (
          <div 
            key={c.id} 
            className="group p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-transparent dark:border-slate-700/50 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between transition-all duration-200"
          >
            <Link to={`/candidates/${c.id}`} className="flex items-center gap-4 flex-1 min-w-0 group-hover:opacity-90 transition-opacity">
              <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                {c.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-colors"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                  <span>{c.title}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span>{c.location}</span>
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STAGE_COLORS[c.stage]}`}>
                {c.stage}
              </div>
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button 
                  onClick={()=>moveStage(c.id, -1)}
                  disabled={STAGES.indexOf(c.stage) === 0}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move to previous stage"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={()=>moveStage(c.id, 1)}
                  disabled={STAGES.indexOf(c.stage) === STAGES.length - 1}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move to next stage"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CandidateForm open={open} onClose={()=>setOpen(false)} />
    </div>
  )
}

