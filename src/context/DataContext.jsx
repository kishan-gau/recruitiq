import React, { createContext, useContext, useEffect, useState } from 'react'
import { getInitialData } from '../mockData'

const DataContext = createContext(null)

export function DataProvider({children}){
  const [state, setState] = useState(()=>{
    try{
      const raw = localStorage.getItem('recruitiq')
      if(raw) return JSON.parse(raw)
    }catch(e){}
    return getInitialData()
  })

  // on mount, optionally fetch from server if API is enabled
  useEffect(()=>{
    if(window?.RECRUITIQ_API === true){
      fetch('/api/data').then(r=>r.json()).then(data=> setState(data)).catch(()=>{})
    }
  },[])

  useEffect(()=>{
    try{ localStorage.setItem('recruitiq', JSON.stringify(state)) }catch(e){}
  },[state])

  // helpers that encapsulate local state + optional server sync
  async function addJob(job){
    if(window?.RECRUITIQ_API === true){
      const res = await fetch('/api/jobs', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(job)})
      if(!res.ok) throw new Error('Failed to create job on server')
      const created = await res.json()
      setState(s=> ({...s, jobs: [created, ...s.jobs]}))
      return created
    }
    // local fallback
    const id = Math.max(0, ...state.jobs.map(j=>j.id))+1
    const created = { id, ...job }
    setState(s=> ({...s, jobs: [created, ...s.jobs]}))
    return created
  }

  async function addCandidate(candidate){
    if(window?.RECRUITIQ_API === true){
      const res = await fetch('/api/candidates', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(candidate)})
      if(!res.ok) throw new Error('Failed to create candidate on server')
      const created = await res.json()
      setState(s=> ({...s, candidates: [created, ...s.candidates]}))
      return created
    }
    // local fallback
    const id = Math.max(0, ...state.candidates.map(c=>c.id))+1
    const created = { id, ...candidate }
    setState(s=> ({...s, candidates: [created, ...s.candidates]}))
    return created
  }

  // optimistic move with undo callback
  async function moveCandidate(id, newStage, opts={showUndo:true, toast}){
    const prev = state.candidates.find(c=>c.id===id)?.stage
    setState(s=> ({...s, candidates: s.candidates.map(c=> c.id===id? {...c, stage:newStage}: c)}))
    if(window?.RECRUITIQ_API === true){
      fetch('/api/candidates/'+id+'/move', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({stage:newStage})}).catch(()=>{})
    }
    if(opts.showUndo && opts.toast){
      const undo = ()=> setState(s=> ({...s, candidates: s.candidates.map(c=> c.id===id? {...c, stage:prev}: c)}))
      opts.toast.show(`Moved to ${newStage}`, {duration: 5000, action: undo})
    }
  }

  async function deleteCandidate(id, opts={toast}){
    const candidate = state.candidates.find(c=> c.id===id)
    if(!candidate) return
    setState(s=> ({...s, candidates: s.candidates.filter(c=> c.id!==id)}))
    if(window?.RECRUITIQ_API === true){
      fetch('/api/candidates/'+id, {method:'DELETE'}).catch(()=>{})
    }
    if(opts.toast){
      const undo = async ()=>{
        // restore locally and on server
        setState(s=> ({...s, candidates: [candidate, ...s.candidates]}))
        if(window?.RECRUITIQ_API === true){
          await fetch('/api/candidates', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(candidate)})
        }
      }
      opts.toast.show('Candidate deleted', {duration: 8000, action: undo})
    }
  }

  const value = { state, setState, addJob, addCandidate, moveCandidate, deleteCandidate }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(){
  const ctx = useContext(DataContext)
  if(!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

export default DataContext
