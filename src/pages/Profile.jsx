import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Profile(){
  const [theme, setTheme] = React.useState(()=>{
    try{ return localStorage.getItem('recruitiq_theme') || 'light' }catch(e){ return 'light' }
  })
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  React.useEffect(()=>{
    try{ localStorage.setItem('recruitiq_theme', theme) }catch(e){}
    if(theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  },[theme])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile Settings</h1>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50 mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Account</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{user?.name || 'User'}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email || 'user@example.com'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50 mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Appearance</h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">Theme</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Current: <span className="font-medium text-emerald-600 dark:text-emerald-400 capitalize">{theme}</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="group relative inline-flex h-10 w-20 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <span className={`inline-block h-8 w-8 transform rounded-full bg-white dark:bg-slate-300 shadow-lg transition-transform duration-200 ${theme === 'dark' ? 'translate-x-11' : 'translate-x-1'} flex items-center justify-center`}>
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">About RecruitIQ</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
          RecruitIQ is a modern applicant tracking system built with React and Tailwind CSS.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
          Version 1.0.0
        </p>
        <button onClick={()=> navigate('/')} className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 rounded font-medium shadow-sm hover:shadow transition-all duration-200">
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
