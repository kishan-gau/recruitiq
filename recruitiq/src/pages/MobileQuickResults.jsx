import React from 'react'
import QuickSearch from '../components/QuickSearch'
import { useNavigate } from 'react-router-dom'

export default function MobileQuickResults(){
  const navigate = useNavigate()
  function handleClose(){
    // Try to navigate back; fall back to root
    try{ navigate(-1) }catch(e){ navigate('/') }
  }
  return (
    <div className="p-4 md:hidden">
      <div className="mb-4 font-semibold">Quick search</div>
      <QuickSearch open={true} onClose={handleClose} />
    </div>
  )
}
