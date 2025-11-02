import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import toast from 'react-hot-toast'

export default function SessionManagement() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getActiveSessions()
      setSessions(response.sessions || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
      toast.error('Failed to load active sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Are you sure you want to logout from this device?')) {
      return
    }

    try {
      setRevoking(sessionId)
      await apiClient.revokeSession(sessionId)
      toast.success('Session revoked successfully')
      
      // Reload sessions
      await loadSessions()
    } catch (error) {
      console.error('Failed to revoke session:', error)
      toast.error(error.message || 'Failed to revoke session')
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to logout from all other devices? This will end all your other sessions.')) {
      return
    }

    try {
      setRevoking('all')
      await apiClient.revokeAllSessions()
      toast.success('All other sessions have been logged out')
      
      // Reload sessions
      await loadSessions()
    } catch (error) {
      console.error('Failed to revoke all sessions:', error)
      toast.error(error.message || 'Failed to logout from other devices')
    } finally {
      setRevoking(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  const getDeviceIcon = (deviceName) => {
    if (!deviceName) return '💻'
    
    const name = deviceName.toLowerCase()
    if (name.includes('iphone') || name.includes('android')) return '📱'
    if (name.includes('ipad') || name.includes('tablet')) return '📱'
    if (name.includes('mac')) return '🖥️'
    if (name.includes('windows')) return '💻'
    if (name.includes('linux')) return '🐧'
    return '💻'
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Active Sessions</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Active Sessions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage where you're logged in
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllSessions}
            disabled={revoking === 'all'}
            className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {revoking === 'all' ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                Logging out...
              </span>
            ) : (
              'Logout All Other Devices'
            )}
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p>No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-start justify-between p-4 rounded-lg border transition-all ${
                session.isCurrent
                  ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="text-3xl">{getDeviceIcon(session.deviceName)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                      {session.deviceName || 'Unknown Device'}
                    </h3>
                    {session.isCurrent && (
                      <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-medium rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-0.5 text-sm text-slate-600 dark:text-slate-400">
                    {session.ipAddress && (
                      <p className="flex items-center gap-1">
                        <span className="text-slate-400 dark:text-slate-500">📍</span>
                        {session.ipAddress}
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <span className="text-slate-400 dark:text-slate-500">🕒</span>
                      Last active: {formatDate(session.lastUsedAt || session.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revoking === session.id}
                  className="ml-4 px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {revoking === session.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700 dark:border-slate-300"></div>
                  ) : (
                    'Logout'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Tip:</strong> If you see unfamiliar devices, logout from them immediately and change your password.
        </p>
      </div>
    </div>
  )
}
