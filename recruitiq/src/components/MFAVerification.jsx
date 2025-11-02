import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function MFAVerification({ mfaToken, onSuccess, onCancel }) {
  const [code, setCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [useBackupCode])

  const handleCodeChange = (value) => {
    // Only allow digits, max 6 characters
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setError('')
  }

  const handleBackupCodeChange = (value) => {
    // Allow alphanumeric for backup codes
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    setBackupCode(cleaned)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!useBackupCode && code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    if (useBackupCode && backupCode.length < 6) {
      setError('Please enter a valid backup code')
      return
    }

    setIsVerifying(true)

    try {
      // Call parent's success handler with the code
      await onSuccess(useBackupCode ? backupCode : code, useBackupCode)
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.')
      if (useBackupCode) {
        setBackupCode('')
      } else {
        setCode('')
      }
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!useBackupCode ? (
            <div>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                className="w-full px-4 py-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                maxLength={6}
                pattern="\d{6}"
                required
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                Open your authenticator app to get your code
              </p>
            </div>
          ) : (
            <div>
              <input
                ref={inputRef}
                type="text"
                value={backupCode}
                onChange={(e) => handleBackupCodeChange(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-4 py-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center text-xl font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                required
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                Each backup code can only be used once
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isVerifying || (!useBackupCode && code.length !== 6) || (useBackupCode && backupCode.length < 6)}
            className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </form>

        {/* Toggle Backup Code / Regular Code */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode)
              setCode('')
              setBackupCode('')
              setError('')
            }}
            className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
          >
            {useBackupCode ? (
              <>← Use authenticator code instead</>
            ) : (
              <>Use backup code →</>
            )}
          </button>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              ← Back to login
            </button>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>💡 Tip:</strong> If you don't have access to your authenticator app, you can use one of your backup codes to login.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
