import React from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { Icon } from './icons'
import FAB from './FAB'
import QuickSearch from './QuickSearch'
import Sidebar from './Sidebar'
import AvatarMenu from './AvatarMenu'
import { useAuth } from '@recruitiq/auth'

export default function Layout({children}){
  const [open, setOpen] = useState(false)
  const [qsOpen, setQsOpen] = useState(false)
  const { mfaWarning, dismissMfaWarning } = useAuth()

  React.useEffect(()=>{
    function onKey(e){
      if(e.key === '/' && !qsOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA'){
        e.preventDefault(); setQsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[qsOpen])
  return (
  <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="sticky top-0 z-30 h-[72px] bg-white border-b flex items-center">
        <div className="px-4 lg:px-6 flex items-center justify-between flex-1">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 text-slate-600 focus-ring" onClick={()=>setOpen(o=>!o)} aria-label="Toggle navigation menu" aria-expanded={open} aria-controls="mobile-drawer">
              <Icon name="menu" className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow">RI</div>
              <div>
                <div className="text-lg font-semibold">RecruitIQ</div>
                <div className="text-xs text-slate-500">Hiring made delightful</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* accessible search control: inline on desktop, modal on mobile */}
            <div>
              <button onClick={()=> setQsOpen(true)} aria-label="Search (press /)" aria-expanded={qsOpen} aria-controls="quicksearch" className="p-2 rounded hover:bg-slate-50 focus-ring flex items-center gap-1">
                <Icon name="search" className="w-5 h-5 text-slate-500" />
                {/* show shortcut hint on md+ only; on mobile the icon is primary */}
                <span className="hidden md:inline-block text-xs text-slate-400 border rounded px-1">/</span>
              </button>
            </div>

            <button className="flex items-center gap-2 bg-emerald-500 text-white px-2 py-1 rounded shadow-sm text-sm focus-ring" aria-label="Create">
              <Icon name="plus" className="w-4 h-4" /> <span>New</span>
            </button>

            <div className="relative">
              <AvatarMenu />
            </div>
          </div>
        </div>
      </header>

      {/* MFA Warning Banner */}
      {mfaWarning && (
        <div className="bg-amber-500 text-white px-4 lg:px-6 py-3 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {mfaWarning.message}
                </p>
                <Link 
                  to="/profile" 
                  className="text-xs text-amber-100 hover:text-white underline mt-1 inline-block"
                >
                  Enable MFA now in your Profile →
                </Link>
              </div>
            </div>
            <button 
              onClick={dismissMfaWarning}
              className="text-amber-200 hover:text-white p-1 flex-shrink-0"
              aria-label="Dismiss warning"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 lg:px-6 py-6 flex gap-6">
        <Sidebar onSearchClick={() => setQsOpen(true)} />

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <div id="mobile-drawer" className={`md:hidden fixed inset-0 z-50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} aria-hidden={!open}>
        <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setOpen(false)} aria-hidden="true" />
        <div className={`absolute left-0 top-0 bottom-0 w-72 bg-white p-4 shadow transform transition-transform ${open ? 'translate-x-0' : '-translate-x-4'}`} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-white font-bold">RI</div>
                <div>
                  <div className="font-semibold">RecruitIQ</div>
                  <div className="text-xs text-slate-400">Workspace</div>
                </div>
              </div>
            {/* Mobile bottom navigation (visible on small screens) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
              <nav className="flex justify-around text-slate-600">
            <NavLink to="/" end className={({isActive})=>`flex flex-col items-center py-2 w-1/4 text-xs ${isActive? 'text-emerald-600 bg-emerald-50 rounded-t-md' : ''}`}>
                  <Icon name="dashboard" className="w-5 h-5" />
                  <span className="mt-1">Home</span>
                </NavLink>
            <NavLink to="/jobs" className={({isActive})=>`flex flex-col items-center py-2 w-1/4 text-xs ${isActive? 'text-emerald-600 bg-emerald-50 rounded-t-md' : ''}`}>
                  <Icon name="briefcase" className="w-5 h-5" />
                  <span className="mt-1">Jobs</span>
                </NavLink>
            <NavLink to="/candidates" className={({isActive})=>`flex flex-col items-center py-2 w-1/4 text-xs ${isActive? 'text-emerald-600 bg-emerald-50 rounded-t-md' : ''}`}>
                  <Icon name="users" className="w-5 h-5" />
                  <span className="mt-1">People</span>
                </NavLink>
            <NavLink to="/pipeline" className={({isActive})=>`flex flex-col items-center py-2 w-1/4 text-xs ${isActive? 'text-emerald-600 bg-emerald-50 rounded-t-md' : ''}`}>
                  <Icon name="kanban" className="w-5 h-5" />
                  <span className="mt-1">Pipeline</span>
                </NavLink>
              </nav>
            </div>

            {/* Mobile FAB for primary action (hidden when quicksearch open) */}
            <FAB hidden={qsOpen} />
              <button onClick={()=>setOpen(false)} className="p-2 text-slate-600"><Icon name="close" /></button>
            </div>
          <nav className="flex flex-col gap-2" role="navigation" aria-label="Mobile primary">
            <NavLink to="/" onClick={()=>setOpen(false)} className="px-2 py-2 rounded hover:bg-slate-50" tabIndex={open?0:-1}>Dashboard</NavLink>
            <NavLink to="/jobs" onClick={()=>setOpen(false)} className="px-2 py-2 rounded hover:bg-slate-50" tabIndex={open?0:-1}>Jobs</NavLink>
            <NavLink to="/candidates" onClick={()=>setOpen(false)} className="px-2 py-2 rounded hover:bg-slate-50" tabIndex={open?0:-1}>Candidates</NavLink>
            <NavLink to="/pipeline" onClick={()=>setOpen(false)} className="px-2 py-2 rounded hover:bg-slate-50" tabIndex={open?0:-1}>Pipeline</NavLink>
          </nav>
        </div>
      </div>
  <QuickSearch open={qsOpen} onClose={()=>setQsOpen(false)} initialQuery={''} />
    </div>
  )
}

 

