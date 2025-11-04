import React from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'

export default function RecentActivitySummary(){
  const { state } = useData()
  const navigate = useNavigate()

  const items = React.useMemo(()=>{
    const list = [...state.candidates].reverse()
    // prefer those with non-Applied stages first
    return list.filter(c=> c.stage && c.stage !== 'Applied').slice(0,3).length ? list.filter(c=> c.stage && c.stage !== 'Applied').slice(0,3) : list.slice(0,3)
  },[state.candidates])

  if(!items || items.length === 0) return <div className="text-sm text-slate-600">No activity yet — move candidates through stages to populate this feed.</div>

  return (
    <div className="p-3 bg-white rounded shadow-sm">
      <div className="text-xs text-slate-500">Recent activity</div>
      <div className="mt-2 space-y-2">
        {items.map(i=> (
          <button key={i.id} onClick={()=> navigate(`/candidates/${i.id}`)} className="text-left w-full">
            <div className="font-medium truncate">{i.name}</div>
            <div className="text-xs text-slate-500 truncate">{i.stage} • {i.title}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
