import React from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

const stages = ['Applied','Phone Screen','Interview','Offer','Hired']

// Stage color mapping for visual consistency
const STAGE_COLORS = {
  'Applied': 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  'Phone Screen': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  'Interview': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  'Offer': 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  'Hired': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
}

export default function Pipeline(){
  const { state, setState, moveCandidate } = useData()
  const toast = useToast()
  const [dragging, setDragging] = React.useState(null)

  function move(id, dir){
    setState(s=>{
      const candidates = s.candidates.map(c=> c.id===id? {...c, stage: stages[Math.max(0, Math.min(stages.length-1, stages.indexOf(c.stage)+dir))]}: c)
      return {...s, candidates}
    })
  }

  function handleDragStart(e, id){
    e.dataTransfer.setData('text/plain', String(id))
    e.dataTransfer.effectAllowed = 'move'
    setDragging(id)
  }

  function handleDragOver(e){
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, stage){
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain'))
    moveCandidate(id, stage, {toast})
    setDragging(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">Drag & drop candidates between stages</div>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Drag cards to move candidates</span>
        </div>
      </div>

      <div className="pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
            {stages.map(stage => (
              <div 
                key={stage} 
                className={`${STAGE_COLORS[stage]} p-4 rounded-lg border transition-all duration-200 min-h-[400px]`}
                onDragOver={handleDragOver} 
                onDrop={(e)=>handleDrop(e, stage)}
              >
                  <div className="font-semibold mb-4 flex items-center justify-between text-slate-900 dark:text-slate-100 text-base">
                    <span>{stage}</span>
                    <span className="text-sm font-normal px-2.5 py-1 bg-white/50 dark:bg-slate-900/30 rounded-full">
                      {state.candidates.filter(c=> c.stage === stage).length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {state.candidates.filter(c=> c.stage === stage).map(c=> (
                      <div 
                        key={c.id}
                        draggable
                        onDragStart={(e)=>handleDragStart(e, c.id)}
                        className="group p-4 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/10 cursor-grab active:cursor-grabbing transition-all duration-200"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">{c.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">{c.title}</div>
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                            {c.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={()=>move(c.id, -1)} 
                            disabled={stages.indexOf(c.stage) === 0}
                            className="flex-1 text-sm px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                          >
                            ← Prev
                          </button>
                          <button 
                            onClick={()=>move(c.id, 1)} 
                            disabled={stages.indexOf(c.stage) === stages.length - 1}
                            className="flex-1 text-sm px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                      ))}
                      {state.candidates.filter(c=> c.stage === stage).length === 0 && (
                        <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
                          No candidates
                        </div>
                      )}
                      {dragging && !state.candidates.find(x=> x.id===dragging)?.stage && (
                        <div className="p-3 bg-white/30 dark:bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">&nbsp;</div>
                      )}
                  </div>
                </div>
          ))}
        </div>
      </div>
    </div>
  )
}
