import React, { useState } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

export default function CandidateForm({open, onClose}){
  const { state, addCandidate } = useData()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('Remote')
  const [jobId, setJobId] = useState(state.jobs[0]?.id || '')

  const toast = useToast()
  function submit(e){
    e.preventDefault()
    if(!name.trim()) return toast.show('Please enter a candidate name')
    const candidate = { name, title, location, jobId: Number(jobId), stage: 'Applied', experience: '', resume: '' }
    addCandidate(candidate).then(()=>{
      toast.show('Candidate added')
      onClose()
    }).catch(err=>{
      console.error(err)
      toast.show('Failed to add candidate on server')
    })
  }

  return (
    <Modal open={open} title="Add candidate" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Current title" className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
        <div className="flex gap-2">
          <input value={location} onChange={e=>setLocation(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
          <select value={jobId} onChange={e=>setJobId(e.target.value)} className="border border-slate-300 dark:border-slate-600 px-2 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow">
            {state.jobs.map(j=> <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-emerald-500 text-white rounded">Add</button>
        </div>
      </form>
    </Modal>
  )
}
