import React, { useState, useEffect } from 'react'
import { authService } from '../services'
import toast from 'react-hot-toast'

export default function MFASetup() {
  const [mfaStatus, setMfaStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState(null) // null | 'qr' | 'verify' | 'backup-codes'
  
  // Setup data
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [manualEntryKey, setManualEntryKey] = useState('')
  const [tempSecret, setTempSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  
  // Disable MFA
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableToken, setDisableToken] = useState('')
  
  // Regenerate backup codes
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState('')
  const [regenerateToken, setRegenerateToken] = useState('')
  
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadMFAStatus()
  }, [])

  const loadMFAStatus = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getMFAStatus()
      setMfaStatus(response)
    } catch (error) {
      console.error('Failed to load MFA status:', error)
      
      // If feature not available (403), show upgrade message
      if (error.status === 403) {
        toast.error('MFA is not available on your current plan')
      } else {
        toast.error('Failed to load MFA status')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStartSetup = async () => {
    try {
      setProcessing(true)
      const response = await apiClient.setupMFA()
      
      setQrCodeUrl(response.data.qrCodeUrl)
      setManualEntryKey(response.data.manualEntryKey)
      setTempSecret(response.tempSecret)
      setSetupStep('qr')
      
      toast.success('Scan the QR code with your authenticator app')
    } catch (error) {
      console.error('Failed to setup MFA:', error)
      toast.error(error.message || 'Failed to setup MFA')
    } finally {
      setProcessing(false)
    }
  }

  const handleVerifySetup = async (e) => {
    e.preventDefault()
    
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    try {
      setProcessing(true)
      const response = await apiClient.verifyMFASetup(verificationCode, tempSecret)
      
      setBackupCodes(response.data.backupCodes)
      setSetupStep('backup-codes')
      
      toast.success('MFA enabled successfully!')
      
      // Reload status
      await loadMFAStatus()
    } catch (error) {
      console.error('Failed to verify MFA setup:', error)
      toast.error(error.message || 'Invalid verification code')
      setVerificationCode('')
    } finally {
      setProcessing(false)
    }
  }

  const handleFinishSetup = () => {
    setSetupStep(null)
    setQrCodeUrl('')
    setManualEntryKey('')
    setTempSecret('')
    setVerificationCode('')
    setBackupCodes([])
  }

  const handleDisableMFA = async (e) => {
    e.preventDefault()

    try {
      setProcessing(true)
      await apiClient.disableMFA(disablePassword, disableToken)
      
      toast.success('MFA has been disabled')
      setShowDisableModal(false)
      setDisablePassword('')
      setDisableToken('')
      
      // Reload status
      await loadMFAStatus()
    } catch (error) {
      console.error('Failed to disable MFA:', error)
      
      if (error.status === 403 && error.response?.data?.reason === 'mandatory_policy') {
        toast.error('MFA cannot be disabled for your organization')
      } else {
        toast.error(error.message || 'Failed to disable MFA')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault()

    try {
      setProcessing(true)
      const response = await apiClient.regenerateBackupCodes(regeneratePassword, regenerateToken)
      
      setBackupCodes(response.data.backupCodes)
      setSetupStep('backup-codes')
      setShowRegenerateModal(false)
      setRegeneratePassword('')
      setRegenerateToken('')
      
      toast.success('New backup codes generated')
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error)
      toast.error(error.message || 'Failed to regenerate backup codes')
    } finally {
      setProcessing(false)
    }
  }

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Backup codes copied to clipboard')
  }

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recruitiq-mfa-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Multi-Factor Authentication (MFA)</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    )
  }

  // Feature not available
  if (!mfaStatus || mfaStatus.feature === false) {
    return (
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Multi-Factor Authentication (MFA)</h2>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            🔒 MFA is not available on your current plan. Upgrade to Professional or Enterprise to enable this security feature.
          </p>
        </div>
      </div>
    )
  }

  // Show backup codes after setup/regenerate
  if (setupStep === 'backup-codes') {
    return (
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">🔐 Save Your Backup Codes</h2>
        
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-2">
            ⚠️ Important: Save these codes in a secure location
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You can use these backup codes to login if you lose access to your authenticator app. Each code can only be used once.
          </p>
        </div>

        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="py-1 text-slate-900 dark:text-slate-100">
              {code}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyBackupCodes}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >
            📋 Copy Codes
          </button>
          <button
            onClick={downloadBackupCodes}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >
            💾 Download
          </button>
          <button
            onClick={handleFinishSetup}
            className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // Show QR code setup
  if (setupStep === 'qr') {
    return (
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">🔐 Setup Multi-Factor Authentication</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-200">
              <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              <strong>Can't scan?</strong> Enter this code manually:
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-slate-100 break-all">
              {manualEntryKey}
            </div>
          </div>

          <form onSubmit={handleVerifySetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <strong>Step 2:</strong> Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={6}
                pattern="\d{6}"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSetupStep(null)}
                className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // MFA enabled - show management options
  if (mfaStatus.enabled) {
    return (
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Multi-Factor Authentication (MFA)</h2>
          <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-sm font-medium rounded-full">
            ✓ Enabled
          </span>
        </div>

        {mfaStatus.required && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              🔒 <strong>MFA is required</strong> by your organization and cannot be disabled.
            </p>
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Your account is protected with multi-factor authentication. You'll need your authenticator app to login.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setShowRegenerateModal(true)}
            className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors text-left flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Regenerate Backup Codes</span>
          </button>

          {!mfaStatus.required && (
            <button
              onClick={() => setShowDisableModal(true)}
              className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors text-left flex items-center gap-2"
            >
              <span>🔓</span>
              <span>Disable MFA</span>
            </button>
          )}
        </div>

        {/* Disable MFA Modal */}
        {showDisableModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Disable MFA</h3>
              
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  ⚠️ Disabling MFA will make your account less secure. You'll only need your password to login.
                </p>
              </div>

              <form onSubmit={handleDisableMFA} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    6-digit code or backup code
                  </label>
                  <input
                    type="text"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableModal(false)
                      setDisablePassword('')
                      setDisableToken('')
                    }}
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Disabling...' : 'Disable MFA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Regenerate Backup Codes Modal */}
        {showRegenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Regenerate Backup Codes</h3>
              
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ This will generate new backup codes and invalidate your old ones. Make sure to save the new codes.
                </p>
              </div>

              <form onSubmit={handleRegenerateBackupCodes} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regeneratePassword}
                    onChange={(e) => setRegeneratePassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    6-digit code from authenticator
                  </label>
                  <input
                    type="text"
                    value={regenerateToken}
                    onChange={(e) => setRegenerateToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegenerateModal(false)
                      setRegeneratePassword('')
                      setRegenerateToken('')
                    }}
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // MFA not enabled - show enable button
  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm border dark:border-slate-700/50">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Multi-Factor Authentication (MFA)</h2>
      
      {mfaStatus.required && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            🔒 <strong>MFA is required</strong> by your organization. Please enable it to secure your account.
          </p>
          {mfaStatus.gracePeriodDaysRemaining > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              ⏰ You have {mfaStatus.gracePeriodDaysRemaining} day{mfaStatus.gracePeriodDaysRemaining !== 1 ? 's' : ''} remaining to enable MFA before your account is locked.
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Add an extra layer of security to your account. You'll need your password and a code from your phone to login.
      </p>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
          ✨ Benefits of MFA:
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Protects against password theft</li>
          <li>Prevents unauthorized access</li>
          <li>Industry standard security practice</li>
        </ul>
      </div>

      <button
        onClick={handleStartSetup}
        disabled={processing}
        className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Setting up...
          </>
        ) : (
          <>
            <span>🔐</span>
            <span>Enable MFA</span>
          </>
        )}
      </button>
    </div>
  )
}
