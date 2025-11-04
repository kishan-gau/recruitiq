import React from 'react'
import Modal from './Modal'
import { Icon } from './icons'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import { tokenScore } from '../utils/searchUtils'
import ConfirmDialog from './ConfirmDialog'

function highlight(text, q){
  if(!q) return text
  const t = text
  const qi = q.trim().toLowerCase()
  const lower = t.toLowerCase()
  const idx = lower.indexOf(qi)
  if(idx === -1) return text
  return (
    <span>
      {t.slice(0, idx)}
      <mark className="bg-emerald-100 text-emerald-700">{t.slice(idx, idx+qi.length)}</mark>
      {t.slice(idx+qi.length)}
    </span>
  )
}

function scoreMatch(text, q){
  if(!q) return 0
  const t = text.toLowerCase()
  const qi = q.trim().toLowerCase()
  if(t === qi) return 100
  const idx = t.indexOf(qi)
  if(idx === 0) return 80
  if(idx > 0) return 50 - idx
  return 0
}

export default function QuickSearch({open, onClose, id='quicksearch', initialQuery=''}){
  const { state } = useData()
  const [q, setQ] = React.useState('')
  const [index, setIndex] = React.useState(0)
  const [debounced, setDebounced] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [history, setHistory] = React.useState(()=>{
    try{ 
      const raw = JSON.parse(localStorage.getItem('recruitiq_qs_history')||'[]')
      // sanitize: drop any previously persisted action entries to avoid duplicate quick actions
      const sanitized = Array.isArray(raw) ? raw.filter(r => r && r.type !== 'action') : []
      // if sanitization removed items, persist the cleaned history back to storage so future mounts are clean
      if(Array.isArray(raw) && raw.length !== sanitized.length){
        try{ localStorage.setItem('recruitiq_qs_history', JSON.stringify(sanitized)) }catch(e){}
      }
      return sanitized
    }catch(e){ return [] }
  })
  const navigate = useNavigate()
  const containerRef = React.useRef(null)
  const openerRef = React.useRef(null)
  const [liveText, setLiveText] = React.useState('')
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)
  const prevCountRef = React.useRef(0)

  // debounce input for a small delay to simulate remote search
  React.useEffect(()=>{
    if(!open) return
    setLoading(true)
    const t = setTimeout(()=>{ setDebounced(q); setLoading(false) }, 220)
    return ()=> clearTimeout(t)
  },[q, open])

  // tokenized matching: split query into tokens and score matches across tokens
  const items = React.useMemo(()=>{
    const qq = debounced.trim()
    if(!qq){
      // show history if no query — also expose quick actions
      // do not include action-type entries from history to avoid duplicate keys with quick actions
      const h = history.filter(h => h.type !== 'action').map(h=> ({type:h.type, id:h.id, title:h.title, subtitle:h.subtitle, fromHistory:true}))
      const quick = [
        {type: 'action', id: 'new-job', title: 'Create job', subtitle: 'Quickly add a job'},
        {type: 'action', id: 'pipeline', title: 'Go to pipeline', subtitle: 'Open pipeline board'}
      ]
      return [...quick, ...h]
    }
    const tokens = qq.toLowerCase().split(/\s+/).filter(Boolean)

    const cand = state.candidates.map(c=> ({type:'candidate', id:c.id, title:c.name, subtitle:`${c.title} • ${c.location||''}`, score: tokenScore(c.name, tokens) + tokenScore(c.title, tokens)}))
      .filter(i=> i.score>0)
    const jobs = state.jobs.map(j=> ({type:'job', id:j.id, title:j.title, subtitle:`${j.location||''} • ${j.type||''}`, score: tokenScore(j.title, tokens) + tokenScore(j.description||'', tokens)}))
      .filter(i=> i.score>0)
    cand.sort((a,b)=> b.score - a.score)
    jobs.sort((a,b)=> b.score - a.score)
    return [...cand, ...jobs].slice(0,12)
  },[debounced, state.candidates, state.jobs, history])

  // when opening, capture the currently focused element (opener) so we can restore focus on close
  React.useEffect(()=>{
    if(open){
      openerRef.current = document.activeElement
      setQ(initialQuery || ''); setDebounced(initialQuery || ''); setIndex(0); setLoading(false)
    }
  },[open])

  // better focus trap and global Escape handling
  React.useEffect(()=>{
    if(!open) return
    const el = containerRef.current
    function onGlobalKey(e){
      if(e.key === 'Escape') onClose()
      if(e.key === 'Tab'){
        // simple tab trap: keep focus inside the modal
        const focusable = el.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])')
        if(focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length-1]
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onGlobalKey)
    return ()=> document.removeEventListener('keydown', onGlobalKey)
  },[open, onClose])

  // debounce aria-live updates and only announce when result count changes
  React.useEffect(()=>{
    if(!open) return
    const t = setTimeout(()=>{
      if(!debounced){
        setLiveText('')
        prevCountRef.current = 0
        return
      }
      if(items.length !== prevCountRef.current){
        setLiveText(`${items.length} results for '${debounced}'`)
        prevCountRef.current = items.length
      }
    }, 300)
    return ()=> clearTimeout(t)
  },[debounced, items.length, open])

  function onKey(e){
    if(e.key === 'ArrowDown'){ e.preventDefault(); setIndex(i=> Math.min(i+1, items.length-1)) }
    if(e.key === 'ArrowUp'){ e.preventDefault(); setIndex(i=> Math.max(0, i-1)) }
    if(e.key === 'Enter' && items[index]){
      const it = items[index]
      // persist selection into history
      try{
        if(it.type !== 'action'){
          const h = {type: it.type, id: it.id, title: it.title, subtitle: it.subtitle}
          const next = [h, ...history.filter(x=> !(x.type===h.type && x.id===h.id))].slice(0,12)
          setHistory(next)
          localStorage.setItem('recruitiq_qs_history', JSON.stringify(next))
        }
      }catch(e){}
      onClose()
      // restore focus to opener if available
      try{ if(openerRef.current && openerRef.current.focus) openerRef.current.focus() }catch(e){}
      if(it.type === 'candidate') navigate(`/candidates/${it.id}`)
      else if(it.type === 'job') navigate(`/jobs/${it.id}`)
    }
    if(e.key === 'Escape') onClose()
  }

  return (
    <Modal open={open} title="Quick search" onClose={onClose}>
      <div ref={containerRef}>
        <div className="flex items-center gap-2 mb-3">
          <input autoFocus value={q} onKeyDown={onKey} onChange={e=>{ setQ(e.target.value); setIndex(0) }} placeholder="Search people or jobs..." className="flex-1 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
          <div className="w-8 h-8 flex items-center justify-center">
            {loading ? (
              <div className="animate-spin text-slate-400"><Icon name="spinner" className="w-5 h-5" /></div>
            ) : (
              <button onClick={()=>{ setQ(''); setDebounced(''); }} aria-label="Clear search" className="text-slate-500">✕</button>
            )}
          </div>
        </div>

  <div aria-live="polite" className="sr-only">{liveText}</div>
        <div className="max-h-64 overflow-auto" role="listbox" aria-activedescendant={items[index]? `qs-${items[index].type}-${items[index].id}`: undefined}>
          {items.length === 0 && debounced && (
            <div className="p-4 text-sm text-slate-500">
              No results. Try different keywords or check your spelling. Suggestions:
              <ul className="list-disc list-inside mt-2 text-xs text-slate-400"><li>Search job titles (e.g. "frontend engineer")</li><li>Search candidate names (e.g. "Alice Johnson")</li></ul>
            </div>
          )}
          {items.map((it, i)=> (
            <div id={`qs-${it.type}-${it.id}`} role="option" aria-selected={i===index} key={`${it.type}-${it.id}`} className={`p-2 rounded cursor-pointer ${i===index? 'bg-slate-100': 'hover:bg-slate-50'}`} onMouseEnter={()=>setIndex(i)} onClick={()=>{ 
              try{
                if(it.type !== 'action'){
                  const h = {type: it.type, id: it.id, title: it.title, subtitle: it.subtitle}
                  const next = [h, ...history.filter(x=> !(x.type===h.type && x.id===h.id))].slice(0,12)
                  setHistory(next)
                  localStorage.setItem('recruitiq_qs_history', JSON.stringify(next))
                }
              }catch(e){}
              if(it.type === 'action'){
                if(it.id === 'pipeline') navigate('/pipeline')
                if(it.id === 'new-job') navigate('/jobs/new')
                onClose(); return
              }
              if(it.type==='candidate') navigate(`/candidates/${it.id}`); else navigate(`/jobs/${it.id}`); onClose() }}>
              <div className="font-medium">{highlight(it.title, debounced)}</div>
              <div className="text-xs text-slate-500">{highlight(it.subtitle || '', debounced)} • {it.type}</div>
              {it.type === 'job' && (
                <div className="text-xs text-slate-400 mt-1">Preview: {it.subtitle}</div>
              )}
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">Recent searches</div>
            <button className="text-sm text-white bg-emerald-600 px-3 py-1 rounded" onClick={()=>{
              setShowClearConfirm(true)
            }}>Clear history</button>
          </div>
        )}
        <ConfirmDialog open={showClearConfirm} title="Clear recent searches" description="Clear recent searches? This cannot be undone." confirmLabel="Clear" cancelLabel="Cancel" onCancel={()=>setShowClearConfirm(false)} onConfirm={()=>{ setHistory([]); localStorage.removeItem('recruitiq_qs_history'); setShowClearConfirm(false) }} />
      </div>
    </Modal>
  )
}
