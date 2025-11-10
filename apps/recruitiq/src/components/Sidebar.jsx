import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { motion, AnimatePresence } from 'framer-motion'
import WorkspaceSelector from './WorkspaceSelector'

const NAV_ITEMS = [
  { id: 'dashboard', to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { id: 'jobs', to: '/jobs', label: 'Jobs', icon: 'briefcase' },
  { id: 'candidates', to: '/candidates', label: 'Candidates', icon: 'users' },
  { id: 'interviews', to: '/interviews', label: 'Interviews', icon: 'calendar' },
  { id: 'pipeline', to: '/pipeline', label: 'Pipeline', icon: 'kanban' },
]

const SECONDARY_NAV_ITEMS = [
  { id: 'reports', to: '/reports', label: 'Reports', icon: 'chart' },
  { id: 'settings', to: '/settings', label: 'Settings', icon: 'settings' },
  { id: 'help', to: '/help', label: 'Help & Support', icon: 'help' },
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

          {/* Search - moved to top for quick access */}
          <div className="mb-4">
            <button 
              onClick={onSearchClick}
              className="w-full flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring transition-colors cursor-pointer"
              aria-label="Open search"
              title="Search (press /)"
            >
              <Icon name="search" className="w-5 h-5 text-slate-400 dark:text-slate-300" />
              {!collapsed && (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex-1 text-left">Search</span>
                  <span className="text-xs text-slate-400 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">/</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700 mb-3"></div>

          {/* Primary Navigation */}
          <nav className={`flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300 relative ${collapsed ? 'overflow-hidden' : ''}`} role="navigation" aria-label="Primary">
            
            {NAV_ITEMS.map(item=> (
              <NavLink key={item.id} to={item.to} end={item.end} className={({isActive})=> `relative group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded transition-colors ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent'}`}>
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Icon name={item.icon} className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
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

          {/* Secondary Navigation */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <nav className={`flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300 relative ${collapsed ? 'overflow-hidden' : ''}`} role="navigation" aria-label="Secondary">
              {SECONDARY_NAV_ITEMS.map(item=> (
                <NavLink key={item.id} to={item.to} end={item.end} className={({isActive})=> `relative group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded ${isActive ? 'bg-slate-100 dark:bg-slate-700/50 text-emerald-600 dark:text-emerald-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                  <div className={`w-5 h-5 flex items-center justify-center ${collapsed ? 'text-current' : 'text-slate-600 dark:text-slate-400'}`}>
                    <Icon name={item.icon} className="w-5 h-5" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
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
          </div>

          {/* Workspace Selector - moved to bottom */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            {!collapsed && <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Workspace</div>}
            <WorkspaceSelector isCollapsed={collapsed} />
          </div>
        </div>
      </motion.div>
      </aside>
    </>
  )
}
