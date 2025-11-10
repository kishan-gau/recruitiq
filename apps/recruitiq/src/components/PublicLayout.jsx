import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@recruitiq/auth'
import { Icon } from './icons'

export default function PublicLayout({ children }) {
  const { user, isApplicant, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header with Navigation */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={isApplicant ? "/applicant/dashboard" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                RI
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                RecruitIQ
              </span>
            </Link>

            {/* Desktop Navigation */}
            {isApplicant ? (
              <>
                <nav className="hidden md:flex items-center gap-1">
                  <NavLink
                    to="/applicant/dashboard"
                    className={({ isActive }) =>
                      `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="dashboard" className="w-4 h-4" />
                      <span>Dashboard</span>
                    </div>
                  </NavLink>
                  <NavLink
                    to="/careers/1"
                    className={({ isActive }) =>
                      `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="briefcase" className="w-4 h-4" />
                      <span>Browse Jobs</span>
                    </div>
                  </NavLink>
                </nav>

                {/* User Menu */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {user?.name?.split(' ')[0] || 'Account'}
                      </span>
                      <Icon name="chevron-down" className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Dropdown */}
                    {userMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {user?.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {user?.email}
                            </div>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Icon name="logout" className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-slate-600 dark:text-slate-400"
                >
                  <Icon name={mobileMenuOpen ? "close" : "menu"} className="w-6 h-6" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/applicant/login"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  Recruiter Login →
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          {isApplicant && mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-700 py-4">
              <nav className="flex flex-col gap-2">
                <NavLink
                  to="/applicant/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`
                  }
                >
                  <Icon name="dashboard" className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink
                  to="/careers/1"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`
                  }
                >
                  <Icon name="briefcase" className="w-4 h-4" />
                  <span>Browse Jobs</span>
                </NavLink>
              </nav>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="px-4 py-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Icon name="logout" className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="mb-2">
              Powered by <span className="font-semibold text-emerald-600 dark:text-emerald-400">RecruitIQ</span>
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <a href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
