import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { motion, AnimatePresence } from 'framer-motion'
import WorkspaceSelector from './WorkspaceSelector'

const NAV_ITEMS = [
  { id: 'dashboard', to: '/', label: 'Dashboard', sub: 'Overview', icon: 'dashboard', end: true },
  { id: 'jobs', to: '/jobs', label: 'Jobs', sub: 'Open roles', icon: 'briefcase' },
  { id: 'candidates', to: '/candidates', label: 'Candidates', sub: 'People', icon: 'users' },
  { id: 'interviews', to: '/interviews', label: 'Interviews', sub: 'Schedule', icon: 'calendar' },
  { id: 'pipeline', to: '/pipeline', label: 'Pipeline', sub: 'Stages', icon: 'kanban' },
]

export default function Sidebar({ onSearchClick }){
  const [collapsed, setCollapsed] = React.useState(()=>{
    try { return localStorage.getItem('recruitiq_sidebar_collapsed') === 'true' }
    catch(e){ return false }
  })

  React.useEffect(()=>{
    try { localStorage.setItem('recruitiq_sidebar_collapsed', String(collapsed)) } catch(e){}
  },[collapsed])

  const location = useLocation()
  const itemRefs = React.useRef({})
  const [pillStyle, setPillStyle] = React.useState(null)

  React.useEffect(()=>{
    // find active item element and set pill position/size relative to the nav container
    const active = NAV_ITEMS.find(i=>{
      if(i.end) return location.pathname === i.to
      return location.pathname.startsWith(i.to)
    })
    const el = active && itemRefs.current[active.id]
    if(el){
      const r = el.getBoundingClientRect()
      const nav = el.closest('nav')
      const navRect = nav?.getBoundingClientRect() || { left: 0, top: 0 }
      // use the nav item's exact bounding rect so the pill covers the link area precisely
      const left = r.left - navRect.left
      const width = r.width
      setPillStyle({ top: r.top - navRect.top, height: r.height, left, width })
    } else {
      setPillStyle(null)
    }
  },[location, collapsed])

  return (
    <>
      {/* show by default; hide on small screens via CSS media query in src/index.css */}
      <aside className="block" data-testid="primary-sidebar">
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.18 }}
        className="overflow-hidden h-full"
      >
        <div className="p-4 bg-white dark:bg-slate-800 rounded shadow-sm sticky top-0">
          {/* compact header: show only compact logo and collapse button to avoid duplicating app header */}
          <div className={`flex items-center mb-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow">RI</div>
              </div>
            )}
            {collapsed && (
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow">RI</div>
            )}
            {!collapsed && (
              <button aria-pressed={collapsed} aria-label="Collapse sidebar" onClick={()=>setCollapsed(true)} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded focus-ring">
                <Icon name="close" className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {collapsed && (
            <div className="flex justify-center mb-4">
              <button aria-pressed={collapsed} aria-label="Expand sidebar" onClick={()=>setCollapsed(false)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded focus-ring">
                <Icon name="menu" className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Workspace Selector */}
          <div className="mb-4">
            {!collapsed && <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Workspace</div>}
            <WorkspaceSelector isCollapsed={collapsed} />
          </div>

          {/* Divider after workspace selector */}
          <div className="border-t border-slate-200 dark:border-slate-700 mb-4"></div>

          <div className={`text-xs text-slate-500 dark:text-slate-400 mb-3 ${collapsed ? 'hidden' : 'block'}`}>Quick Actions</div>
          <div className="mb-3">
            {!collapsed && <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Search</div>}
            <button 
              onClick={onSearchClick}
              className="w-full flex items-center bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring transition-colors cursor-pointer"
              aria-label="Open search"
            >
              <Icon name="search" className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} text-slate-400 dark:text-slate-300`} />
              {!collapsed && <span className="ml-2 text-sm text-slate-400 dark:text-slate-300">Search people & jobs</span>}
            </button>
          </div>

          <nav className={`flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300 relative ${collapsed ? 'overflow-hidden' : ''}`} role="navigation" aria-label="Primary">
            {/* animated active pill */}
            <AnimatePresence>
              {pillStyle && !collapsed && (
                <>
                  {/* full-width pale background for the active item */}
                  <motion.div layoutId="active-pill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', left: pillStyle.left, width: pillStyle.width, borderRadius: 8, background: 'rgba(236, 253, 245, 1)', top: pillStyle.top, height: pillStyle.height, zIndex: 0 }} className="pointer-events-none shadow-sm dark:bg-slate-700/50" />
                  {/* thin left accent bar */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', left: Math.max(0, pillStyle.left - 8), width: 8, borderRadius: 8, background: 'rgb(16,185,129)', top: pillStyle.top, height: pillStyle.height, zIndex: 0 }} className="pointer-events-none shadow-sm" />
                </>
              )}
            </AnimatePresence>
            
            {NAV_ITEMS.map(item=> (
              <NavLink key={item.id} to={item.to} end={item.end} className={({isActive})=> `nav-accent relative group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded ${isActive && !collapsed ? 'active text-emerald-600 dark:text-emerald-400' : ''} ${isActive && collapsed ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`} ref={el=> itemRefs.current[item.id]=el}>
                <div className={`${collapsed ? 'w-6 h-6' : 'w-8 h-8'} flex items-center justify-center ${collapsed ? 'text-current' : 'text-slate-600 dark:text-slate-400'} z-10`}><Icon name={item.icon} className={collapsed ? 'w-6 h-6' : 'w-5 h-5'} /></div>
                {!collapsed && (
                  <div className="relative z-10 flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.sub}</div>
                  </div>
                )}

                {/* collapsed tooltip */}
                <AnimatePresence>
                  {collapsed && (
                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white rounded px-2 py-1 text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </nav>

          {!collapsed && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              Filters & views
            </div>
          )}
        </div>
      </motion.div>
      </aside>
    </>
  )
}
