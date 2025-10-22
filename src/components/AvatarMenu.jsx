import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function AvatarMenu(){
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const menuRef = React.useRef(null)
  const firstRef = React.useRef(null)
  const secondRef = React.useRef(null)

  async function logout(){
    try{ localStorage.removeItem('recruitiq_user'); localStorage.removeItem('auth_token'); }catch(e){}
    // optional: call backend logout endpoint if exists
    try{ await fetch('/api/logout', { method: 'POST', credentials: 'include' }) }catch(e){}
    navigate('/')
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
      <button aria-haspopup="true" aria-expanded={open} onClick={()=>setOpen(o=>!o)} className="w-9 h-9 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center focus-ring">
        U
      </button>
      {open && (
        <div role="menu" aria-label="User menu" ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white border rounded shadow py-1">
          <button ref={firstRef} role="menuitem" onClick={()=>{ setOpen(false); navigate('/profile') }} className="w-full text-left px-3 py-2 hover:bg-slate-50">Profile</button>
          <button ref={secondRef} role="menuitem" onClick={()=>{ setOpen(false); logout() }} className="w-full text-left px-3 py-2 hover:bg-slate-50">Log out</button>
        </div>
      )}
    </div>
  )
}
