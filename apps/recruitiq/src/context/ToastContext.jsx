import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({children}){
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, opts={duration:3000, action:null})=>{
    const id = Date.now() + Math.random()
    setToasts(t=> [...t, { id, message, action: opts.action }])
    if(opts.duration !== Infinity){
      setTimeout(()=> setToasts(t=> t.filter(x=> x.id !== id)), opts.duration)
    }
    return id
  },[])

  const dismiss = useCallback((id)=> setToasts(t=> t.filter(x=> x.id !== id)), [])

  const value = { show, dismiss }
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        {toasts.map(t=> (
          <div key={t.id} className="bg-slate-900 text-white px-4 py-2 rounded shadow flex items-center gap-3">
            <div className="flex-1">{t.message}</div>
            {t.action && (
              <button onClick={()=>{ t.action(); dismiss(t.id) }} className="underline">Undo</button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(){
  const ctx = useContext(ToastContext)
  if(!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export default ToastContext
