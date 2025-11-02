import React, { useState, useRef, useEffect } from 'react'

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
      setError(err.response?.data?.message || err.message || 'Invalid code. Please try again.')
      if (useBackupCode) {
        setBackupCode('')
      } else {
        setCode('')
      }
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-gray-600 text-sm">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {error}
          </div>
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
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg bg-white text-gray-900 text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                maxLength={6}
                pattern="\d{6}"
                required
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center mt-2">
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
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg bg-white text-gray-900 text-center text-xl font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center mt-2">
                Each backup code can only be used once
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isVerifying || (!useBackupCode && code.length !== 6) || (useBackupCode && backupCode.length < 6)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to login
            </button>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 Tip:</strong> If you don't have access to your authenticator app, you can use one of your backup codes to login.
          </p>
        </div>
      </div>
    </div>
  )
}
