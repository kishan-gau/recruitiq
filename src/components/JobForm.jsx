import React, { useState } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

export default function JobForm({open, onClose}){
  const { state, addJob } = useData()
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('Remote')
  const [type, setType] = useState('Full-time')
  const [openings, setOpenings] = useState(1)

  const toast = useToast()
  function submit(e){
    e.preventDefault()
    if(!title.trim()) return toast.show('Please enter a job title')
    const job = { title, location, type, openings: Number(openings), description: '' }
    addJob(job).then(()=>{
      toast.show('Job created')
      onClose()
    }).catch(err=>{
      console.error(err)
      toast.show('Failed to create job on server')
    })
  }

  return (
    <Modal open={open} title="Create job" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
        <div className="flex gap-2">
          <input value={location} onChange={e=>setLocation(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
          <select value={type} onChange={e=>setType(e.target.value)} className="border border-slate-300 dark:border-slate-600 px-2 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow">
            <option>Full-time</option>
            <option>Contract</option>
            <option>Part-time</option>
          </select>
        </div>
        <input type="number" min={1} value={openings} onChange={e=>setOpenings(e.target.value)} className="w-28 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-emerald-500 text-white rounded">Create</button>
        </div>
      </form>
    </Modal>
  )
}
