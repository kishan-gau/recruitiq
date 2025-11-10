import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@recruitiq/auth'

export default function AvatarMenu(){
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const menuRef = React.useRef(null)
  const firstRef = React.useRef(null)
  const secondRef = React.useRef(null)

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  React.useEffect(()=>{
    function onDoc(e){ if(!e.target.closest || !e.target.closest('.avatar-menu')) setOpen(false) }
    function onKey(e){
      if(!open) return
      if(e.key === 'Escape') setOpen(false)
      if(e.key === 'ArrowDown'){
        e.preventDefault()
        if(document.activeElement === firstRef.current) secondRef.current.focus()
        else firstRef.current.focus()
      }
      if(e.key === 'ArrowUp'){
        e.preventDefault()
        if(document.activeElement === secondRef.current) firstRef.current.focus()
        else secondRef.current.focus()
      }
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return ()=>{ document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey) }
  },[open])

  return (
    <div className="relative avatar-menu">
      <button 
        aria-haspopup="true" 
        aria-expanded={open} 
        onClick={()=>setOpen(o=>!o)} 
        className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center focus-ring text-white font-semibold shadow-sm hover:shadow-md transition-shadow"
        title={user?.name || 'User'}
      >
        {user?.name?.charAt(0).toUpperCase() || 'U'}
      </button>
      {open && (
        <div role="menu" aria-label="User menu" ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
          {/* User Info */}
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
              {user?.name || 'User'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || 'user@example.com'}
            </div>
          </div>
          
          {/* Menu Items */}
          <button 
            ref={firstRef} 
            role="menuitem" 
            onClick={()=>{ setOpen(false); navigate('/profile') }} 
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Settings
          </button>
          
          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
          
          <button 
            ref={secondRef} 
            role="menuitem" 
            onClick={handleLogout} 
            className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
